/**
 * Review Service
 *
 * - İsim maskeleme: herkese açık çıktıda tam isim ASLA verilmez.
 * - Çeviri önbelleği: ?lang= ile istenen dil ilk okumada üretilip
 *   translations'a yazılır, sonrası bedava. Günde değil, dil başına
 *   yorum başına tek AI çağrısı.
 */
import aiService from './aiService';

export const REVIEW_LANGUAGES = ['en', 'tr', 'it', 'es', 'ar'] as const;
export type ReviewLanguage = (typeof REVIEW_LANGUAGES)[number];

/** "Ahmet Yılmaz" → "Ahmet Y***" · "Ayşe" → "Ay***" · "Elif K." → "Elif K." */
export function maskReviewerName(name: unknown): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Anonim';
  const maskWord = (w: string): string => {
    if (w.length <= 2) return `${w[0] || ''}***`;
    // "K." gibi zaten maskeli kısaltmaya dokunma
    if (/^[A-ZÇĞİÖŞÜ]\.$/.test(w)) return w;
    return `${w.slice(0, Math.min(2, w.length))}***`;
  };
  if (parts.length === 1) return maskWord(parts[0]);
  const [first, ...rest] = parts;
  const restStr = rest.join(' ');
  // "Elif K." gibi zaten maskeli kısaltmaya dokunma
  if (/^[A-ZÇĞİÖŞÜ]\.?$/.test(restStr)) return `${first} ${restStr.endsWith('.') ? restStr : `${restStr}.`}`;
  const lastInitial = restStr.charAt(0).toLocaleUpperCase('tr-TR');
  return `${first} ${lastInitial}***`;
}

export function normalizeReviewLanguage(input: unknown): ReviewLanguage {
  const lang = String(input || '').trim().toLowerCase();
  return (REVIEW_LANGUAGES as readonly string[]).includes(lang) ? (lang as ReviewLanguage) : 'tr';
}

/**
 * Yorumun istenen dildeki başlık+yorumunu döndürür (önbellekli).
 * Orijinal dil isteniyorsa çevirisiz döner. Onaysız yoruma çeviri yapılmaz.
 */
export async function localizeReview(
  review: any,
  lang: ReviewLanguage
): Promise<{ title: string | null; comment: string | null; language: ReviewLanguage; translated: boolean }> {
  const origLang = normalizeReviewLanguage(review.language);
  const origTitle = review.title || null;
  const origComment = review.comment || null;
  if (lang === origLang || !review.isApproved) {
    return { title: origTitle, comment: origComment, language: origLang, translated: false };
  }
  const cached = (review.translations || {})[lang];
  if (cached && (cached.title || cached.comment)) {
    return {
      title: cached.title ?? origTitle,
      comment: cached.comment ?? origComment,
      language: lang,
      translated: true
    };
  }
  // Önbellekte yoksa tek seferlik üret + kaydet (site dili başına yorum başına 1 çağrı)
  const langNames: Record<string, string> = { en: 'English', tr: 'Turkish', it: 'Italian', es: 'Spanish', ar: 'Arabic' };
  const [tTitle, tComment] = await Promise.all([
    origTitle ? aiService.translateText(origTitle, langNames[lang]).catch(() => origTitle) : Promise.resolve(origTitle),
    origComment ? aiService.translateText(origComment, langNames[lang]).catch(() => origComment) : Promise.resolve(origComment)
  ]);
  const next = { ...(review.translations || {}), [lang]: { title: tTitle, comment: tComment } };
  try {
    await review.update({ translations: next });
  } catch {
    // Önbellek yazılamazsa yine de çeviriyi dön (salt-okunur bozulmaz)
  }
  return { title: tTitle, comment: tComment, language: lang, translated: true };
}

/** Herkese açık yorum çıktısı (maskeli isim + yerelleştirilmiş metin). */
export async function publicReviewJson(review: any, lang: ReviewLanguage): Promise<any> {
  const text = await localizeReview(review, lang);
  return {
    id: review.id,
    reviewerName: maskReviewerName(review.reviewerName),
    rating: review.rating,
    title: text.title,
    comment: text.comment,
    language: text.language,
    originalLanguage: normalizeReviewLanguage(review.language),
    translated: text.translated,
    source: review.source || 'human',
    isVerifiedPurchase: !!review.isVerifiedPurchase,
    createdAt: review.createdAt
  };
}

export default { maskReviewerName, normalizeReviewLanguage, localizeReview, publicReviewJson, REVIEW_LANGUAGES };
