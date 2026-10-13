/**
 * Scrape deposundaki specs'leri ürünlere işler.
 *
 * Kullanim:
 *   npx ts-node src/scripts/apply-feed-specs.ts --feed=<feedId> [--limit=50]
 *   npx ts-node src/scripts/apply-feed-specs.ts --feed=<feedId> --apply [--limit=0]
 *
 * --apply yoksa SADECE önizleme (DB'ye dokunmaz).
 * Kurallar:
 * - Sadece verified=true satırlar.
 * - gramWeight NULL olan ürüne: ALTIN GRAMI sayıysa yazılır.
 * - milyem NULL olan ürüne: ALTIN AYARI'ndan (14→585, 22→916, 18→750, 8→333) yazılır.
 * - pricingType'a DOKUNULMAZ (fiyat feed'de kalır, altın formülü ezmez).
 * - Manuel girilmiş gram/milyem ASLA ezilmez.
 */
import dotenv from 'dotenv';

dotenv.config();

function parseGram(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const m = String(raw).replace(/\s+/g, '').match(/(\d+[.,]?\d*)/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(v) && v > 0 && v < 10000 ? v : null;
}

function parseMilyem(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).toLocaleUpperCase('tr-TR');
  const ayar = s.match(/(\d+)\s*AYAR/);
  const num = ayar ? parseInt(ayar[1], 10) : parseInt(s, 10);
  if (num === 8 || num === 333) return 333;
  if (num === 14 || num === 585) return 585;
  if (num === 18 || num === 750) return 750;
  if (num === 22 || num === 916) return 916;
  if (num === 24 || num === 999) return 999;
  return null;
}

function parseCarat(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const m = String(raw).replace(/\s+/g, '').match(/(\d+[.,]?\d*)/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(v) && v > 0 && v < 1000 ? Math.round(v * 10000) / 10000 : null;
}

function parseQuantity(raw: unknown): number {
  if (raw === null || raw === undefined) return 1;
  const m = String(raw).match(/(\d+)/);
  const v = m ? parseInt(m[1], 10) : 1;
  return Number.isFinite(v) && v > 0 ? v : 1;
}

/** Başlıktan kesim yakala (baget, markiz, oval, prenses, yuvarlak, damla, zümrüt). */
function detectCut(title: unknown): string | null {
  const t = String(title || '').toLocaleLowerCase('tr-TR');
  const cuts = ['baget', 'markiz', 'oval', 'prenses', 'yuvarlak', 'damla', 'zumrut', 'zümrüt', 'kalemli'];
  for (const c of cuts) {
    if (t.includes(c)) return c === 'zumrut' ? 'zümrüt' : c;
  }
  return null;
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? '1'];
    })
  );
  const apply = args.apply === '1';
  const limit = parseInt(args.limit || '0', 10) || 0;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: Product } = require('../models/Product');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: ExternalProductSpec } = require('../models/ExternalProductSpec');

  if (!args.feed) throw new Error('--feed=<feedId> zorunlu');

  const rows = await ExternalProductSpec.findAll({
    where: { feedId: args.feed, verified: true },
    order: [['createdAt', 'ASC']],
    ...(limit > 0 ? { limit } : {})
  });
  console.log(`[Apply] ${rows.length} doğrulanmış specs (${apply ? 'UYGULANIYOR' : 'ÖNİZLEME'})`);

  let gramHit = 0;
  let milyemHit = 0;
  let updated = 0;
  const samples: string[] = [];
  // Ürünleri bir kez çek, normalize SKU ile indexle
  const allProducts = await Product.findAll({
    where: { feedSourceId: args.feed },
    attributes: ['id', 'sku', 'title', 'storeId', 'gramWeight', 'milyem']
  });
  const byNormSku = new Map<string, any>();
  for (const p of allProducts as any[]) {
    byNormSku.set(String(p.sku).toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞİÖŞÜ0-9]/gi, ''), p);
  }
  for (const row of rows as any[]) {
    // Eski satırlardaki "Özellikler ..." önek bulaşmasını normalize et
    const rawSpecs = row.specs || {};
    const specs: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawSpecs)) {
      specs[String(k).toLocaleUpperCase('tr-TR').replace(/^ÖZELLİKLER\s+/, '')] = String(v);
    }
    const gram = parseGram(specs['ALTIN GRAMI']);
    const milyem = parseMilyem(specs['ALTIN AYARI']);
    const diamondCarat = parseCarat(specs['PIRLANTA KARATI']);
    if (gram === null && milyem === null && diamondCarat === null && Object.keys(specs).length === 0) continue;

    const norm = String(row.sku).toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞİÖŞÜ0-9]/gi, '');
    const product = byNormSku.get(norm);
    if (!product) continue;

    const patch: any = {};
    if (gram !== null && (product.gramWeight === null || product.gramWeight === undefined)) {
      patch.gramWeight = gram;
      gramHit++;
    }
    if (milyem !== null && (product.milyem === null || product.milyem === undefined)) {
      patch.milyem = milyem;
      milyemHit++;
    }
    if (Object.keys(patch).length === 0 && Object.keys(specs).length === 0) continue;
    // Tüm teknik özellik sözlüğünü ürüne yaz (detay sayfasında tablo olarak gösterilir)
    if (Object.keys(specs).length > 0) patch.specs = specs;
    if (patch.gramWeight && (patch.milyem || product.milyem)) {
      const m = patch.milyem || product.milyem;
      patch.gramHas = Math.round(Number(patch.gramWeight) * (Number(m) / 1000) * 10000) / 10000;
    }
    if (samples.length < 10) samples.push(`${product.sku}: gram=${patch.gramWeight ?? '-'} milyem=${patch.milyem ?? '-'}`);
    if (apply) {
      await product.update(patch);
      updated++;
      // Pırlanta specs'i taş seçeneğine dönüştür (üründe taş yoksa; manuel kazanır)
      await maybeCreateDiamondStone(product, specs);
    } else {
      const stonePreview = previewDiamondStone(product, specs);
      if (stonePreview && samples.length < 20) samples.push(`  tas: ${stonePreview}`);
    }
  }

  console.log(`[Apply] gram doldurulabilir: ${gramHit}, milyem doldurulabilir: ${milyemHit}, güncellenen: ${updated}`);
  console.log(samples.join('\n'));
  const sequelize = require('../config/database').default;
  await sequelize.close();
}

/** Specs'ten pırlanta taş önizleme metni (uygulamaz). */
function previewDiamondStone(product: any, specs: Record<string, string>): string | null {
  const carat = parseCarat(specs['PIRLANTA KARATI']);
  if (carat === null) return null;
  const cut = detectCut(product.title);
  const quality = specs['PIRLANTA RENK / BERRAKLIK'] || specs['PIRLANTA RENK'] || null;
  const qty = parseQuantity(specs['PIRLANTA ADEDİ']);
  return `${product.sku}: Pırlanta ${carat}ct${cut ? ` ${cut}` : ''}${quality ? ` ${quality}` : ''} x${qty}`;
}

/** Pırlanta specs'i ProductStone satırına dönüştür (yoksa oluştur). */
async function maybeCreateDiamondStone(product: any, specs: Record<string, string>): Promise<void> {
  const carat = parseCarat(specs['PIRLANTA KARATI']);
  if (carat === null) return;
  const { default: ProductStone } = require('../models/ProductStone');
  const existing = await ProductStone.findOne({ where: { productId: product.id } });
  if (existing) return;
  const { default: Gemstone } = require('../models/Gemstone');
  const [gem] = await Gemstone.findOrCreate({
    where: { storeId: null, name: 'Pırlanta' },
    defaults: { storeId: null, name: 'Pırlanta', pricePerCaratUSD: 0, isActive: true }
  });
  await ProductStone.create({
    productId: product.id,
    gemstoneId: (gem as any).id,
    carat,
    cut: detectCut(product.title),
    quality: (specs['PIRLANTA RENK / BERRAKLIK'] || specs['PIRLANTA RENK'] || null)?.substring(0, 120) || null,
    quantity: parseQuantity(specs['PIRLANTA ADEDİ']),
    // Tedarikçi ürünü taşlı gelir: seçim yok, bilgi olarak gösterilir
    isFixed: true
  });
}

main().catch(err => {
  console.error('[Apply] Fatal:', err?.message || err);
  process.exit(1);
});
