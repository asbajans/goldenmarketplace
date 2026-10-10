/**
 * Category Detection Service
 *
 * Matches product titles against per-category keywords (admin-editable via
 * Category.keywords, with broad TR+EN built-in defaults as fallback).
 *
 * Matching rules:
 * - Titles and keywords are lowercased + Turkish-folded (yüzük→yuzuk) so
 *   "yuzuk" matches "Yüzük" and vice versa.
 * - Whole-word-prefix match (word boundary at start, suffixes allowed) so
 *   "ring" never matches "earring" but "yüzük" matches "yüzüğü"/"yüzükler"
 *   (Turkish agglutination).
 * - When several categories match, the LAST occurring keyword wins — Turkish
 *   product titles are head-final ("Tektaş Pırlanta Yüzük 0,45 Karat",
 *   "Yüzük Efektli Kolye"), so the type word closest to the end is usually
 *   the real one. No hit → null (product stays for manual review).
 */

const TR_FOLD: Record<string, string> = {
  'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u'
};

export function foldTr(input: unknown): string {
  const s = String(input || '');
  if (!s) return '';
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (ch) => TR_FOLD[ch] || ch);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Built-in fallback keywords per category slug (used when Category.keywords
 * is empty). Deliberately broad TR + EN + ASCII variants.
 */
export const DEFAULT_CATEGORY_KEYWORDS: Record<string, string[]> = {
  yuzuk: [
    'yüzük', 'yuzuk', 'ring', 'rings',
    'tektaş', 'tektas', 'tek taş', 'tek tas',
    'yeditaş', 'yeditas', 'tamtur', 'tam tur',
    'yarımtur', 'yarimtur', 'yarım tur', 'yarim tur',
    'alyans', 'yüzüğü'
  ],
  kolye: [
    'kolye', 'necklace', 'necklaces',
    'gerdanlık', 'gerdanlik', 'gerdanlıklar',
    'suyolu gerdanlık', 'suyolu gerdanlik',
    'pendant', 'pendants', 'kolye ucu', 'kolyeucu'
  ],
  kupe: [
    'küpe', 'kupe', 'küpeler', 'kupeler',
    'earring', 'earrings',
    'pirsing', 'piercing', 'hızma', 'hizma'
  ],
  bileklik: [
    'bileklik', 'bracelet', 'bracelets',
    'kelepçe', 'kelepce', 'bilekliği'
  ],
  bilezik: [
    'bilezik', 'bilezikler', 'bangle', 'bangles'
  ],
  saat: [
    'saat', 'saati', 'watch', 'watches'
  ],
  sets: [
    'takı seti', 'taki seti', 'takı set', 'taki set',
    'mücevher seti', 'mucevher seti',
    'set', 'sets'
  ]
};

interface DetectableCategory {
  id: string;
  slug: string;
  isActive?: boolean;
  keywords?: string[] | null;
}

export function keywordsForCategory(cat: DetectableCategory): string[] {
  const custom = (cat as any).keywords;
  if (Array.isArray(custom) && custom.length > 0) return custom;
  return DEFAULT_CATEGORY_KEYWORDS[cat.slug] || [];
}

export interface CategoryMatch {
  categoryId: string;
  slug: string;
}

/**
 * Returns the best category for a title, or null when nothing (or nothing
 * conclusive) matches. 'genel' never matches — it is the fallback.
 */
export function detectCategoryFromTitle(
  title: unknown,
  categories: DetectableCategory[]
): CategoryMatch | null {
  const folded = foldTr(title);
  if (!folded) return null;

  let best: { pos: number; categoryId: string; slug: string } | null = null;

  for (const cat of categories) {
    if ((cat as any).isActive === false) continue;
    if (cat.slug === 'genel') continue;
    for (const kw of keywordsForCategory(cat)) {
      const foldedKw = foldTr(kw).trim();
      if (!foldedKw) continue;
      const m = new RegExp(`\\b${escapeRegExp(foldedKw)}\\w*`).exec(folded);
      if (m && (!best || m.index > best.pos)) {
        best = { pos: m.index, categoryId: cat.id, slug: cat.slug };
      }
    }
  }

  return best ? { categoryId: best.categoryId, slug: best.slug } : null;
}

export default { foldTr, keywordsForCategory, detectCategoryFromTitle, DEFAULT_CATEGORY_KEYWORDS };
