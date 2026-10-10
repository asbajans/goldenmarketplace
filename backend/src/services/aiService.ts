import GlobalSetting from '../models/GlobalSetting';

export interface AIResponse {
  content: string;
  success: boolean;
  error?: string;
}

export type AIPurpose = 'translation' | 'content' | 'blog';

export interface AIModelEntry {
  provider: string;
  model: string;
  apiKey?: string;
}

/** Amaç → ayar anahtarı. image ayrı (generateImage zaten kendi modelini okuyor). */
const PURPOSE_SETTING_KEY: Record<AIPurpose, string> = {
  translation: 'ai_translation_models',
  content: 'ai_content_model',
  blog: 'ai_blog_model'
};

/** Devre kesici: üst üste patlayan model 10 dk atlanır (tek process belleği). */
const breaker = new Map<string, { fails: number; until: number }>();
const BREAKER_FAILS = 3;
const BREAKER_COOLDOWN_MS = 10 * 60 * 1000;

function breakerKey(e: AIModelEntry): string {
  return `${e.provider}|${e.model}`;
}

function breakerOpen(e: AIModelEntry): boolean {
  const b = breaker.get(breakerKey(e));
  if (!b) return false;
  if (Date.now() > b.until) {
    breaker.delete(breakerKey(e));
    return false;
  }
  return b.fails >= BREAKER_FAILS;
}

function breakerReport(e: AIModelEntry, ok: boolean): void {
  const k = breakerKey(e);
  if (ok) {
    breaker.delete(k);
    return;
  }
  const b = breaker.get(k) || { fails: 0, until: 0 };
  b.fails += 1;
  if (b.fails >= BREAKER_FAILS) b.until = Date.now() + BREAKER_COOLDOWN_MS;
  breaker.set(k, b);
}

class AIService {
  /**
   * Zaman aşımlı fetch. SAĞLAYICI TAKILIRSA kuyruk sonsuza kadar
   * kilitlenmesin diye (Bull concurrency 1 — tek asılı çağrı tüm
   * kuyruğu durdurur, modal da hiç kapanmaz).
   */
  private async fetchWithTimeout(url: string, init: any, ms: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`AI sağlayıcısı ${Math.round(ms / 1000)} sn içinde yanıt vermedi (zaman aşımı)`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async getSettings() {
    const settings = await GlobalSetting.findAll({
      where: { key: ['ai_provider', 'ai_api_key', 'ai_model'] }
    });
    
    let provider = 'openai'; // default
    let apiKey = '';
    let model = 'gpt-4o-mini';

    for(const s of settings) {
      if(s.key === 'ai_provider') provider = s.value;
      if(s.key === 'ai_api_key') apiKey = s.value;
      if(s.key === 'ai_model') model = s.value;
    }

    return { provider, apiKey, model };
  }

  /** Tüm ai_* ayarlarını tek sorguda harita olarak döndürür. */
  private async getAllAISettings(): Promise<Record<string, string>> {
    const settings = await GlobalSetting.findAll({
      where: {
        key: ['ai_provider', 'ai_api_key', 'ai_model',
              'ai_translation_models', 'ai_content_model', 'ai_blog_model']
      }
    });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return map;
  }

  private parseEntry(raw: any, fallbackProvider: string): AIModelEntry | null {
    if (!raw || typeof raw !== 'object') return null;
    const model = String(raw.model || '').trim();
    if (!model) return null;
    return {
      provider: String(raw.provider || fallbackProvider || 'openai').trim() || 'openai',
      model,
      apiKey: String(raw.apiKey || '').trim() || undefined
    };
  }

  /**
   * Amaca göre sıralı model zinciri. Önce amaca özel ayar, boşsa
   * legacy tekli (ai_provider/ai_model) ayar tek elemanlı zincir olur.
   * Çeviri anahtarı girilmediyse ortak ai_api_key kullanılır.
   */
  async resolveChain(purpose: AIPurpose): Promise<AIModelEntry[]> {
    const all = await this.getAllAISettings();
    const fallbackProvider = all.ai_provider || 'openai';
    const fallbackKey = all.ai_api_key || '';
    const raw = (all[PURPOSE_SETTING_KEY[purpose]] || '').trim();

    const chain: AIModelEntry[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of list) {
          const entry = this.parseEntry(item, fallbackProvider);
          if (entry) {
            if (!entry.apiKey && fallbackKey) entry.apiKey = fallbackKey;
            chain.push(entry);
          }
        }
      } catch {
        // Bozuk JSON yok sayılır, legacy'ye düşülür
      }
    }
    if (chain.length === 0) {
      const legacyModel = (all.ai_model || 'gpt-4o-mini').trim();
      chain.push({ provider: fallbackProvider, model: legacyModel, apiKey: fallbackKey || undefined });
    }
    return chain;
  }

  /** Zincir özeti (admin teşhisi + hazır kontrolü için). */
  async getChainInfo(purpose: AIPurpose): Promise<{ entries: Array<AIModelEntry & { keyConfigured: boolean; skippedByBreaker: boolean }>; usable: number }> {
    const chain = await this.resolveChain(purpose);
    const entries = chain.map(e => ({
      ...e,
      apiKey: undefined,
      keyConfigured: !!((e.apiKey || '').trim()),
      skippedByBreaker: breakerOpen(e)
    }));
    return { entries, usable: entries.filter(e => e.keyConfigured && !e.skippedByBreaker).length };
  }

  /**
   * Zincir çağrısı: sırayla dener, hata/zaman aşımında sonrakine geçer.
   * Hepsi patlarsa birleşik hatayı fırlatır (çağıran task'ı failed yapar).
   */
  async generateForPurpose(
    purpose: AIPurpose,
    systemPrompt: string,
    userPrompt: string,
    opts?: { timeoutMs?: number }
  ): Promise<AIResponse> {
    const chain = await this.resolveChain(purpose);
    const timeoutMs = opts?.timeoutMs || (purpose === 'translation' ? 60000 : 90000);
    const tried: string[] = [];
    const errors: string[] = [];

    for (const entry of chain) {
      if (breakerOpen(entry)) {
        tried.push(`${entry.provider}/${entry.model} (devre-kesici: atlandı)`);
        continue;
      }
      if (!entry.apiKey) {
        errors.push(`${entry.provider}/${entry.model}: API anahtarı yok`);
        continue;
      }
      tried.push(`${entry.provider}/${entry.model}`);
      const res = await this.callModel(entry, systemPrompt, userPrompt, timeoutMs);
      if (res.success && res.content && res.content.trim()) {
        breakerReport(entry, true);
        return res;
      }
      breakerReport(entry, false);
      errors.push(`${entry.provider}/${entry.model}: ${res.error || 'boş yanıt'}`);
      // Yapılandırma hatası (401/403/404) aynı anahtarla tekrar denemez —
      // ama FARKLI anahtarlı sıradaki girdiye geçilir (o yüzden continue).
    }

    const detail = errors.length > 0 ? ` Denenenler: ${tried.join(' → ')}. Hatalar: ${errors.join(' | ').slice(0, 500)}` : '';
    return {
      success: false,
      content: '',
      error: `Tüm ${purpose} modelleri başarısız.${detail} Admin → Sistem Ayarları → AI bölümünden modelleri kontrol edin.`
    };
  }

  async generateContent(systemPrompt: string, userPrompt: string, overrides?: { provider?: string; apiKey?: string; model?: string }): Promise<AIResponse> {
    const dbSettings = await this.getSettings();
    const entry: AIModelEntry = {
      provider: overrides?.provider || dbSettings.provider,
      model: overrides?.model || dbSettings.model,
      apiKey: overrides?.apiKey || dbSettings.apiKey || undefined
    };
    if (!entry.apiKey) {
      return { success: false, content: '', error: 'AI API Key not configured.' };
    }
    return this.callModel(entry, systemPrompt, userPrompt, 90000);
  }

  /** Tek model çağrısı (taşıyıcı). Hata fırlatmaz — AIResponse döner. */
  private async callModel(entry: AIModelEntry, systemPrompt: string, userPrompt: string, timeoutMs: number): Promise<AIResponse> {
    const { provider, apiKey, model } = entry;
    if (!apiKey) {
      return { success: false, content: '', error: 'AI API Key not configured.' };
    }

    try {
      if (provider === 'openai' || provider === 'openrouter') {
        const baseUrl = provider === 'openrouter' 
          ? 'https://openrouter.ai/api/v1/chat/completions' 
          : 'https://api.openai.com/v1/chat/completions';
        
        const headers: any = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        };

        if (provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://golden-marketplace.test'; // Replace with actual domain
          headers['X-Title'] = 'Golden Marketplace';
        }

        const res = await this.fetchWithTimeout(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          })
        }, timeoutMs);

        if (!res.ok) {
           const errText = await res.text();
           throw new Error(`API Error: ${res.status} ${errText}`);
        }

        const data: any = await res.json();
        return { success: true, content: data.choices[0].message.content };
      } 
      else if (provider === 'gemini') {
        // Direct Gemini REST API (v1beta or v1)
         const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
         
         const res = await this.fetchWithTimeout(url, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             contents: [
                 { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
              ]
            })
          }, timeoutMs);

         if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini Error: ${res.status} ${errText}`);
         }
         
         const data: any = await res.json();
         const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
         return { success: true, content: text };
      }

      return { success: false, content: '', error: 'Unknown provider' };

    } catch (error: any) {
      console.error('[AIService] Failed generation:', error);
      return { success: false, content: '', error: error.message };
    }
  }

  // Common usecases
  async translateText(text: string, targetLanguage: string, purpose: AIPurpose = 'translation'): Promise<string> {
    const res = await this.generateForPurpose(
      purpose,
      `You are an expert translator for a jewelry e-commerce site. Translate the given text to ${targetLanguage}. Keep the translation natural and persuasive for shoppers. Maintain any jewelry-specific terminology. Return ONLY the translated string, no quotes or surrounding text.`,
      text
    );
    return res.success ? res.content : text;
  }

  /** Sağlayıcı durumu: anahtar tanımlı mı, hangi provider/model? */
  async getProviderInfo(): Promise<{ provider: string; model: string; configured: boolean }> {
    const s = await this.getSettings();
    return { provider: s.provider, model: s.model, configured: !!(s.apiKey && s.apiKey.trim()) };
  }

  /** Çeviri hattı hazır mı? Zincirde kullanılabilir ≥1 model + format geçerliliği. */
  async assertTranslationReady(): Promise<string | null> {
    const info = await this.getChainInfo('translation');
    if (info.usable === 0) {
      return 'Çeviri için kullanılabilir AI modeli yok. Admin → Sistem Ayarları → AI bölümünden çeviri modeli ekleyin (veya genel API anahtarı + modeli girin).';
    }
    for (const e of info.entries) {
      if (!e.keyConfigured) continue;
      const fmt = this.validateModelFormat(e.provider, e.model);
      if (fmt) return fmt;
    }
    return null;
  }

  /**
   * Model adı format kontrolü. En yaygın sessiz patlama nedeni:
   * OpenRouter'da model "sağlayıcı/model" formatında olmalı
   * (örn. openai/gpt-4o-mini). Yalın ad 404 verir:
   * "No endpoints found for <model>".
   */
  validateModelFormat(provider: string, model: string): string | null {
    const m = (model || '').trim();
    if (!m) return 'AI modeli boş. Admin → Sistem Ayarları → AI bölümünden model girin.';
    if (provider === 'openrouter' && !m.includes('/')) {
      return `OpenRouter model adı "sağlayıcı/model" formatında olmalı (örn. openai/gpt-4o-mini). Şu anki değer ("${m}") 404 verir: "No endpoints found".`;
    }
    if ((provider === 'openai' || provider === 'gemini') && m.includes('/')) {
      return `Seçili sağlayıcı (${provider}) için model adı yalın olmalı, ancak değer ("${m}") OpenRouter formatında. Ya sağlayıcıyı openrouter yapın ya da model adını düzeltin.`;
    }
    return null;
  }

  /** 401/403/404 tipi hatalar yapılandırma hatasıdır — retry anlamsız. */
  private isConfigError(message: string): boolean {
    return /401|403|404|unauthorized|forbidden|not found|no endpoints|invalid.*(key|model|api)|authentication/i.test(message || '');
  }

  private providerError(action: string, detail?: string): Error {
    return new Error(
      `AI ${action} başarısız. API anahtarını ve modeli Admin → Sistem Ayarları → AI bölümünden kontrol edin.` +
      (detail ? ` Sağlayıcı yanıtı: ${detail.slice(0, 300)}` : '')
    );
  }

  /**
   * Hata fırlatan çeviri (ürün hattı için). Başarısız çağrıda kaynak
   * metni sessizce geri DÖNMEZ — hata yukarı taşınır, task failed olur.
   */
  async translateTextStrict(text: string, targetLanguage: string, action = 'çeviri'): Promise<string> {
    const res = await this.generateForPurpose(
      'translation',
      `You are an expert translator for a jewelry e-commerce site. Translate the given text to ${targetLanguage}. Keep the translation natural and persuasive for shoppers. Maintain any jewelry-specific terminology. Return ONLY the translated string, no quotes or surrounding text.`,
      text
    );
    if (!res.success || !res.content || !res.content.trim()) {
      throw this.providerError(action, res.error);
    }
    return res.content;
  }

  /**
   * Ürün BAŞLIĞI çevirisi: model ismi / koleksiyon kodu / SKU benzeri
   * jetonlar (örn. BLZ-001), sayılar, ayar damgaları (22K, 585, 916)
   * ve ölçüler AYNI BIRAKILIR; geri kalan kelimeler çevrilir.
   */
  async translateTitleStrict(title: string, targetLanguage: string): Promise<string> {
    const res = await this.generateForPurpose(
      'translation',
      `You are an expert translator for a jewelry e-commerce site. Translate the product TITLE to ${targetLanguage}. Rules:
- Translate the descriptive words (material, product type, adjectives) naturally for shoppers.
- DO NOT translate model names, collection codes, SKU-like tokens (e.g. BLZ-001, ABC123), numbers, carat stamps (22K, 585, 916, 750, 333, 999) or measurements — keep them exactly as-is, in place.
- Return ONLY the translated title, no quotes or surrounding text.`,
      title
    );
    if (!res.success || !res.content || !res.content.trim()) {
      throw this.providerError('başlık çevirisi', res.error);
    }
    return res.content;
  }

  /** Hata fırlatan açıklama üretimi (ürün hattı için). */
  async generateProductDescriptionStrict(title: string, category: string, language: string, keywords?: string): Promise<string> {
    const res = await this.generateForPurpose(
      'content',
      `You are a professional jewelry product description writer for an e-commerce marketplace.
Generate a detailed, persuasive product description in ${language} for the following item.
The description should be 2-4 sentences, covering:
- Product type and material quality
- Craftsmanship and design details
- Ideal for gifting or special occasions
- Any care or wearing tips if applicable

Use natural, flowing language appropriate for the target language.
Do NOT include HTML tags, markdown, or meta text. Return ONLY the description text.`,
      `Title: ${title}\nCategory: ${category}${keywords ? `\nKeywords: ${keywords}` : ''}`
    );
    if (!res.success || !res.content || !res.content.trim() || res.content.trim() === title.trim()) {
      throw this.providerError('açıklama üretimi', res.error);
    }
    return res.content;
  }

  async generateProductDescription(title: string, category: string, language: string, keywords?: string): Promise<string> {
    const res = await this.generateForPurpose(
      'content',
      `You are a professional jewelry product description writer for an e-commerce marketplace. 
Generate a detailed, persuasive product description in ${language} for the following item.
The description should be 2-4 sentences, covering:
- Product type and material quality
- Craftsmanship and design details
- Ideal for gifting or special occasions
- Any care or wearing tips if applicable

Use natural, flowing language appropriate for the target language.
Do NOT include HTML tags, markdown, or meta text. Return ONLY the description text.`,
      `Title: ${title}\nCategory: ${category}${keywords ? `\nKeywords: ${keywords}` : ''}`
    );
    return res.success ? res.content : title;
  }

  /**
   * Ürün hattı çevirisi: BAŞLIK + AÇIKLAMA her dile çevrilir.
   * Başarısız diller `errors` içinde döner; HİÇBİR dil çevrilemediyse
   * hata fırlatılır (sessiz "başarılı" yok).
   */
  async translateProduct(
    title: string,
    description: string,
    languages: string[]
  ): Promise<{ translations: Record<string, { title: string; description: string }>; errors: Record<string, string> }> {
    const translations: Record<string, { title: string; description: string }> = {};
    const errors: Record<string, string> = {};
    let firstCall = true;
    for (const lang of languages) {
      const langName = this.getLanguageName(lang);
      try {
        // Free-tier rate-limit koruması: çağrılar arası kısa bekleme
        if (!firstCall) await this.sleep(500);
        firstCall = false;
        translations[lang] = await this.translateOneLanguageStrict(title, description, langName);
      } catch (err: any) {
        const msg = err?.message || 'Unknown translation error';
        errors[lang] = msg;
        // Fail fast on config errors (401/403/404): retrying the other
        // languages would produce the same error and spam the provider.
        if (this.isConfigError(msg)) {
          const fmtHint = await this.modelFormatHint();
          throw new Error(`${msg}${fmtHint ? ` ${fmtHint}` : ''}`);
        }
      }
    }
    if (Object.keys(translations).length === 0) {
      const first = Object.entries(errors)[0];
      throw new Error(
        `Hiçbir dile çeviri yapılamadı${first ? ` (${first[0]}: ${first[1]})` : ''}`
      );
    }
    return { translations, errors };
  }

  /** Model format hint for the current provider/model, if any. */
  private async modelFormatHint(): Promise<string> {
    try {
      const info = await this.getProviderInfo();
      return this.validateModelFormat(info.provider, info.model) || '';
    } catch {
      return '';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Tırnak/code-fence temizliği + başlık kısaltma (VARCHAR(255) taşmasını önler). */
  private cleanTitle(s: string): string {
    let t = (s || '').replace(/```[a-z]*|```/gi, '').trim();
    t = t.replace(/^["'`«»„“”‘’]+|["'`«»„“”‘’]+$/g, '').trim();
    t = t.split('\n')[0].trim();
    t = t.replace(/\s+/g, ' ');
    if (t.length > 180) t = t.slice(0, 180).trim();
    return t;
  }

  /** Açıklama temizliği (fence/kırpıntı temizle, makul üst sınır). */
  private cleanDescription(s: string): string {
    let t = (s || '').replace(/```[a-z]*|```/gi, '').trim();
    t = t.replace(/^["'`«»„“”‘’]+|["'`«»„“”‘’]+$/g, '').trim();
    if (t.length > 4000) t = t.slice(0, 4000).trim();
    return t;
  }

  /**
   * Tek dil için BAŞLIK + AÇIKLAMA tek çağrıda (JSON).
   * Ürün başına 10 çağrı yerine 5 çağrı → hızlı + rate-limit dostu.
   */
  private async translateOneLanguageStrict(
    title: string,
    description: string,
    langName: string
  ): Promise<{ title: string; description: string }> {
    const res = await this.generateForPurpose(
      'translation',
      `You are an expert translator for a jewelry e-commerce site. Translate the product TITLE and DESCRIPTION to ${langName}.
Rules for TITLE:
- Translate the descriptive words naturally for shoppers.
- DO NOT translate model names, collection codes, SKU-like tokens (e.g. BLZ-001, TTYKT 119), numbers, carat stamps (22K, 14K, 585, 916, 750, 333, 999) or measurements — keep them exactly as-is, in place.
- If the title is already in ${langName}, return it EXACTLY unchanged (do not rephrase, extend or shorten it).
Rules for DESCRIPTION:
- Natural, persuasive translation for shoppers; keep jewelry-specific terminology.
- If it is already in ${langName}, return it EXACTLY unchanged.
Return ONLY a raw JSON object, no code fences, no extra text: {"title": "...", "description": "..."}`,
      `TITLE: ${title}\nDESCRIPTION: ${description || '(empty)'}`
    );
    if (!res.success || !res.content || !res.content.trim()) {
      throw this.providerError('çeviri', res.error);
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(res.content.trim());
    } catch {
      const m = res.content.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { parsed = null; }
      }
    }
    const cleanT = parsed && typeof parsed.title === 'string' ? this.cleanTitle(parsed.title) : '';
    const cleanD = parsed && typeof parsed.description === 'string' ? this.cleanDescription(parsed.description) : '';
    // Kaynak açıklama doluyken boş dönen / başlıksız dönen sonuç çöptür — dile yazma.
    if (!cleanT || (description && description.trim() && !cleanD)) {
      throw this.providerError('çeviri', `model geçersiz sonuç döndürdü: ${res.content.slice(0, 200)}`);
    }
    return { title: cleanT, description: cleanD };
  }

  private getLanguageName(code: string): string {
    const map: Record<string, string> = {
      en: 'English', tr: 'Turkish', it: 'Italian', es: 'Spanish', ar: 'Arabic',
      de: 'German', fr: 'French', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese'
    };
    return map[code] || code;
  }

  async generateAllDescriptions(title: string, category: string, tags?: string): Promise<Record<string, string>> {
    const languages = [
      { code: 'tr', name: 'Turkish' },
      { code: 'en', name: 'English' },
      { code: 'it', name: 'Italian' },
      { code: 'es', name: 'Spanish' },
      { code: 'ar', name: 'Arabic' },
    ];

    const langList = languages.map(l => `${l.code}: ${l.name}`).join(', ');
    const res = await this.generateForPurpose(
      'content',
      `You are a professional jewelry product description writer for an e-commerce marketplace.
Generate a short, persuasive product description (2-4 sentences) for EACH of the following languages: ${langList}.

Return a valid JSON object where keys are language codes and values are the description strings.
Example format: {"tr": "Türkçe açıklama...", "en": "English description...", "it": "Descrizione italiana...", "es": "Descripción en español...", "ar": "وصف باللغة العربية..."}

Cover: product type, material quality, craftsmanship, gifting occasions.
Do NOT wrap the JSON in markdown code blocks. Return ONLY raw JSON.`,
      `Title: ${title}\nCategory: ${category}${tags ? `\nKeywords: ${tags}` : ''}`
    );

    if (res.success) {
      try {
        const parsed = JSON.parse(res.content);
        const result: Record<string, string> = {};
        for (const l of languages) {
          if (parsed[l.code] && typeof parsed[l.code] === 'string' && parsed[l.code].length > 5) {
            result[l.code] = parsed[l.code];
          }
        }
        // Model bazen 1-2 dili eksik döndürür ("sadece İngilizce geldi" şikayeti).
        // Eksikleri tek tek üreterek tamamla, en azından kısmi sonuçla dönme.
        if (Object.keys(result).length > 0) {
          for (const l of languages) {
            if (!result[l.code]) {
              const desc = await this.generateProductDescription(title, category, l.name, tags);
              if (desc && desc !== title) result[l.code] = desc;
            }
          }
          if (Object.keys(result).length >= 3) return result;
        }
      } catch { /* fallback to per-language */ }
    }

    const result: Record<string, string> = {};
    for (const l of languages) {
      const desc = await this.generateProductDescription(title, category, l.name, tags);
      if (desc && desc !== title) result[l.code] = desc;
    }
    return result;
  }

   async generateSEOMeta(productTitle: string, category: string, description: string): Promise<{ title: string, description: string }> {
      const res = await this.generateForPurpose(
        'content',
        `You are an SEO expert for an e-commerce jewelry store. Create a JSON object with 'title' (max 60 chars) and 'description' (max 160 chars) based on the input. Return raw JSON without markdown formatting.`,
       `Title: ${productTitle}\nCategory: ${category}\nDescription: ${description}`
     );
     try {
       return JSON.parse(res.content);
     } catch(e) {
       return { title: productTitle, description: description.substring(0, 150) };
     }
  }

  /**
   * Generate a cover image with AI. Uses the SAME api key as text, but a
   * dedicated model from the `ai_image_model` setting (Admin → AI Ayarları).
   * Supports openai (images API), openrouter (chat + image modality) and
   * gemini (image preview models). Returns a data-URL (or raw base64) that
   * can be passed straight to s3Service.uploadBase64Image.
   */
  async generateImage(prompt: string): Promise<{ success: boolean; dataUrl: string; error?: string }> {
    const rows = await GlobalSetting.findAll({
      where: { key: ['ai_provider', 'ai_api_key', 'ai_image_model'] }
    });
    const map: Record<string, string> = {};
    for (const s of rows) map[s.key] = s.value;
    const provider = map.ai_provider || 'openai';
    const apiKey = map.ai_api_key || '';
    const imageModel = (map.ai_image_model || '').trim();

    if (!apiKey) return { success: false, dataUrl: '', error: 'AI API Key not configured.' };
    if (!imageModel) return { success: false, dataUrl: '', error: 'AI image model not configured (Admin → AI Ayarları → Görsel Modeli).' };

    const styledPrompt = `Luxurious fine gold jewelry photography for an e-commerce blog cover, photorealistic, elegant warm lighting, no text, no watermark. Subject: ${prompt}`;
    try {
      if (provider === 'openai') {
        const res = await this.fetchWithTimeout('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: imageModel, prompt: styledPrompt, size: '1024x1024', response_format: 'b64_json' })
        }, 180000);
        if (!res.ok) throw new Error(`Images API error: ${res.status} ${(await res.text()).slice(0, 200)}`);
        const data: any = await res.json();
        const b64 = data?.data?.[0]?.b64_json;
        if (!b64) throw new Error('Image API returned no image');
        return { success: true, dataUrl: `data:image/png;base64,${b64}` };
      }
      if (provider === 'openrouter') {
        // Dedicated Images API (NOT chat completions: pure image models like
        // recraft/* have no endpoint serving chat+image modalities).
        // Docs: https://openrouter.ai/docs/features/multimodal/image-generation
        const res = await this.fetchWithTimeout('https://openrouter.ai/api/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://goldencrafters.com',
            'X-Title': 'Golden Crafters Blog'
          },
          body: JSON.stringify({ model: imageModel, prompt: styledPrompt })
        }, 180000);
        if (!res.ok) {
          const errText = (await res.text()).slice(0, 300);
          throw new Error(
            `OpenRouter Images API error ${res.status}: ${errText} ` +
            `(Görsel Modeli resim üreten bir model olmalı — örn. google/gemini-2.5-flash-image)`
          );
        }
        const data: any = await res.json();
        const item = data?.data?.[0];
        if (item?.b64_json) {
          return { success: true, dataUrl: `data:image/png;base64,${item.b64_json}` };
        }
        if (typeof item?.url === 'string' && item.url.startsWith('data:image')) {
          return { success: true, dataUrl: item.url };
        }
        if (typeof item?.url === 'string' && /^https?:\/\//.test(item.url)) {
          // Remote URL (may expire) — download now so we can host it on S3.
          const imgRes = await this.fetchWithTimeout(item.url, {}, 120000);
          if (!imgRes.ok) throw new Error(`Could not download generated image (${imgRes.status})`);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const mime = imgRes.headers.get('content-type') || 'image/png';
          return { success: true, dataUrl: `data:${mime};base64,${buf.toString('base64')}` };
        }
        throw new Error('Images API returned no image data');
      }
      if (provider === 'gemini') {
        const res = await this.fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: styledPrompt }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          })
        }, 180000);
        if (!res.ok) throw new Error(`Gemini error: ${res.status} ${(await res.text()).slice(0, 200)}`);
        const data: any = await res.json();
        const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
        const inline = parts.find((p: any) => p?.inlineData?.data);
        if (!inline) throw new Error('Model returned no image');
        return { success: true, dataUrl: `data:${inline.inlineData.mimeType || 'image/png'};base64,${inline.inlineData.data}` };
      }
      return { success: false, dataUrl: '', error: 'Unknown provider' };
    } catch (error: any) {
      console.error('[AIService] Image generation failed:', error?.message || error);
      return { success: false, dataUrl: '', error: error?.message || 'Image generation failed' };
    }
  }
}

export default new AIService();
