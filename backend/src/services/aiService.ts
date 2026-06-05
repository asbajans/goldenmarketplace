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

  async translateProduct(title: string, description: string, languages: string[]): Promise<Record<string, { title: string; description: string }>> {
    const result: Record<string, { title: string; description: string }> = {};
    for (const lang of languages) {
      const translatedTitle = await this.translateText(title, this.getLanguageName(lang));
      const translatedDesc = description ? await this.translateText(description, this.getLanguageName(lang)) : '';
      result[lang] = { title: translatedTitle, description: translatedDesc };
    }
    return result;
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
        if (Object.keys(result).length >= 3) return result;
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
}

export default new AIService();
