import GlobalSetting from '../models/GlobalSetting';

export interface AIResponse {
  content: string;
  success: boolean;
  error?: string;
}

class AIService {
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

  async generateContent(systemPrompt: string, userPrompt: string, overrides?: { provider?: string; apiKey?: string; model?: string }): Promise<AIResponse> {
    const dbSettings = await this.getSettings();
    const provider = overrides?.provider || dbSettings.provider;
    const apiKey = overrides?.apiKey || dbSettings.apiKey;
    const model = overrides?.model || dbSettings.model;

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

        const res = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          })
        });

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
         
         const res = await fetch(url, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             contents: [
                { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
             ]
           })
         });

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
  async translateText(text: string, targetLanguage: string): Promise<string> {
    const res = await this.generateContent(
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
    const res = await this.generateContent(
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
    const res = await this.generateContent(
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
    const res = await this.generateContent(
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
    const res = await this.generateContent(
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
    for (const lang of languages) {
      const langName = this.getLanguageName(lang);
      try {
        const translatedTitle = await this.translateTitleStrict(title, langName);
        const translatedDesc = description
          ? await this.translateTextStrict(description, langName, 'açıklama çevirisi')
          : '';
        translations[lang] = { title: translatedTitle, description: translatedDesc };
      } catch (err: any) {
        errors[lang] = err?.message || 'Bilinmeyen çeviri hatası';
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
    const res = await this.generateContent(
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
     const res = await this.generateContent(
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
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: imageModel, prompt: styledPrompt, size: '1024x1024', response_format: 'b64_json' })
        });
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
        const res = await fetch('https://openrouter.ai/api/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://goldencrafters.com',
            'X-Title': 'Golden Crafters Blog'
          },
          body: JSON.stringify({ model: imageModel, prompt: styledPrompt })
        });
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
          const imgRes = await fetch(item.url);
          if (!imgRes.ok) throw new Error(`Could not download generated image (${imgRes.status})`);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const mime = imgRes.headers.get('content-type') || 'image/png';
          return { success: true, dataUrl: `data:${mime};base64,${buf.toString('base64')}` };
        }
        throw new Error('Images API returned no image data');
      }
      if (provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: styledPrompt }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          })
        });
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
