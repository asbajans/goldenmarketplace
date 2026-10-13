/**
 * Tek seferlik tedarikçi detay scrape'i.
 *
 * Kullanim:
 *   npx ts-node src/scripts/scrape-feed-specs.ts --feed=<feedId> [--limit=50] [--delay=2500] [--force]
 *
 * Akis (her SKU): site-ici arama -> SKU iceren link -> detay sayfasi ->
 * özellik tablosu parse -> ÜRÜN KODU dogrulama -> external_product_specs'e yaz.
 * Dogrulanamayan hicbir sey yazilmaz. Kaldigi yerden devam eder (resume).
 * Fiyat/stok gibi degisken verilere DOKUNMAZ, sadece teknik özellik toplar.
 */
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function normalizeSku(s: unknown): string {
  return String(s || '')
    .toLocaleUpperCase('tr-TR')
    .replace(/[^A-ZÇĞİÖŞÜ0-9]/gi, '');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function get(url: string): Promise<string> {
  const res = await axios.get(url, {
    timeout: 30000,
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    responseType: 'text'
  });
  return String(res.data || '');
}

/** Arama sayfasindan normalize SKU iceren ilk ürün linkini bulur. */
function findProductLink(searchHtml: string, normSku: string): string | null {
  const re = /<a[^>]+href="([^"]+)"[^>]*>/gi;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(searchHtml)) !== null) {
    const href = (m[1] || '').trim();
    if (!/^https?:\/\//i.test(href)) continue;
    if (/route=(common|product\/search|product\/category|checkout|account|information)/i.test(href)) continue;
    let path = '';
    try {
      path = new URL(href.split('?')[0]).pathname.replace(/\/+$/, '');
    } catch {
      continue;
    }
    if (path.length <= 1) continue; // ana sayfa ve kök linkleri ele
    candidates.push(href.split('?')[0].replace(/\/+$/, ''));
  }
  const uniq = [...new Set(candidates)];
  // Önce path'inde SKU geçen, yoksa ürün-benzeri ilk link
  const direct = uniq.find(h => {
    let slug = '';
    try {
      slug = new URL(h).pathname.split('/').pop() || '';
    } catch {
      return false;
    }
    const n = normalizeSku(decodeURIComponent(slug));
    return (n && normSku && (n.includes(normSku) || normSku.includes(n))) || /pirlanta|kolye|yuzuk|kupe|bileklik|bilezik|set|alyans|saat|tekta|yeditas|yarimtur|tamtur|gerdanlik|kelepce|hizma|pirsing/i.test(slug);
  });
  return direct || null;
}

/** Detay sayfasindaki Özellikler tablosunu {KEY: VALUE} yapar. */
function parseSpecs(detailHtml: string): Record<string, string> {
  const specs: Record<string, string> = {};
  const tableRe = /<table[^>]*class="[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRe.exec(detailHtml)) !== null) {
    const body = tm[1];
    const rowRe = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(body)) !== null) {
      const strip = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
      // thead hücresi ("Özellikler") ilk satırın anahtarına bulaşabilir — temizle
      const key = strip(rm[1]).toLocaleUpperCase('tr-TR').replace(/^ÖZELLİKLER\s+/, '');
      const val = strip(rm[2]);
      if (key && key !== 'ÖZELLİKLER') specs[key] = val;
    }
  }
  return specs;
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? '1'];
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: Product } = require('../models/Product');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: ExternalProductSpec } = require('../models/ExternalProductSpec');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: ExternalFeed } = require('../models/ExternalFeed');

  const feed = args.feed
    ? await ExternalFeed.findByPk(args.feed)
    : await ExternalFeed.findOne({ where: { isActive: true }, order: [['createdAt', 'ASC']] });
  if (!feed) throw new Error('Feed bulunamadı (--feed=<id> verin)');
  console.log(`[Scrape] Feed: ${feed.name} (${feed.id})`);

  const siteBase = String(feed.feedUrl).split('/index.php')[0] || 'https://www.pirlantakatalogu.com';
  const limit = parseInt(args.limit || '0', 10) || 0;
  const delay = parseInt(args.delay || '2500', 10) || 2500;
  const force = args.force === '1';

  const products = await Product.findAll({
    where: { feedSourceId: feed.id },
    attributes: ['id', 'sku', 'title'],
    order: [['createdAt', 'ASC']],
    ...(limit > 0 ? { limit } : {})
  });
  console.log(`[Scrape] ${products.length} ürün taranacak (gecikme: ${delay}ms)`);

  const stats = { ok: 0, unverified: 0, noLink: 0, failed: 0, skipped: 0 };
  for (const p of products as any[]) {
    const normSku = normalizeSku(p.sku);
    if (!normSku) {
      stats.skipped++;
      continue;
    }
    if (!force) {
      const existing = await ExternalProductSpec.findOne({ where: { feedId: feed.id, sku: normSku } });
      if (existing) {
        stats.skipped++;
        continue;
      }
    }
    try {
      // Önce ham SKU (boşluklu), sonuç yoksa normalize SKU ile dene
      const queries = [...new Set([String(p.sku).trim(), normSku].filter(Boolean))];
      let link: string | null = null;
      for (const q of queries) {
        const searchUrl = `${siteBase}/index.php?route=product/search&search=${encodeURIComponent(q)}`;
        const searchHtml = await get(searchUrl);
        link = findProductLink(searchHtml, normSku);
        if (link) break;
        await sleep(Math.round(delay / 2));
      }
      if (!link) {
        stats.noLink++;
        console.log(`[..] ${p.sku}: link bulunamadı`);
        continue;
      }
      await sleep(Math.round(delay / 2));
      const detailHtml = await get(link);
      const specs = parseSpecs(detailHtml);
      const pageCode = normalizeSku(specs['ÜRÜN KODU'] || '');
      // Feed SKU'su sayfadaki kodun içinde geçmeli (BGTKPKL184KL vs "BGTKPKL 184 KL")
      const verified = !!pageCode && (pageCode.includes(normSku) || normSku.includes(pageCode));
      if (!verified) {
        stats.unverified++;
        console.log(`[..] ${p.sku}: kod uyuşmadı (sayfada: "${specs['ÜRÜN KODU'] || '-'}")`);
        continue;
      }
      await ExternalProductSpec.upsert({
        feedId: feed.id,
        sku: normSku,
        sourceUrl: link,
        specs,
        verified: true,
        fetchedAt: new Date()
      } as any);
      stats.ok++;
      const gram = specs['ALTIN GRAMI'] || '-';
      const ayar = specs['ALTIN AYARI'] || '-';
      console.log(`[OK] ${p.sku}: gram=${gram} ayar=${ayar}`);
    } catch (err: any) {
      stats.failed++;
      console.log(`[XX] ${p.sku}: ${err?.message || err}`);
    }
    await sleep(delay);
  }

  console.log(`[Scrape] BİTTİ ok=${stats.ok} unverified=${stats.unverified} noLink=${stats.noLink} failed=${stats.failed} skipped=${stats.skipped}`);
  const sequelize = require('../config/database').default;
  await sequelize.close();
}

main().catch(err => {
  console.error('[Scrape] Fatal:', err?.message || err);
  process.exit(1);
});
