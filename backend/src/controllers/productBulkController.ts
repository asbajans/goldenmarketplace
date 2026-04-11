import { Request, Response } from 'express';
import * as xlsx from 'xlsx';
import { parseStringPromise } from 'xml2js';
import Product from '../models/Product';
import Store from '../models/Store';

export const parseBulkFile = async (req: Request, res: Response) => {
    try {
        const file = (req as any).file;
        if (!file) {
            return res.status(400).json({ success: false, error: 'Dosya yüklenmedi.' });
        }

        const fileName = file.originalname.toLowerCase();
        const buffer = file.buffer;
        let data: any[] = [];

        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            data = xlsx.utils.sheet_to_json(sheet);
        } else if (fileName.endsWith('.xml')) {
            const xmlString = buffer.toString('utf-8');
            const result = await parseStringPromise(xmlString, { explicitArray: false, ignoreAttrs: true });
            
            // XML could have various structures. We'll try to find the first array.
            const findArray = (obj: any): any[] | null => {
                if (Array.isArray(obj)) return obj;
                if (typeof obj === 'object' && obj !== null) {
                    for (const key of Object.keys(obj)) {
                        const childArray = findArray(obj[key]);
                        if (childArray) return childArray;
                    }
                }
                return null;
            };

            const foundArray = findArray(result);
            if (foundArray) {
                data = foundArray;
            } else if (typeof result === 'object' && result !== null) {
                 // wrap the single root object in an array just in case
                 const keys = Object.keys(result);
                 if (keys.length === 1 && typeof result[keys[0]] === 'object') {
                     data = Array.isArray(result[keys[0]]) ? result[keys[0]] : [result[keys[0]]];
                 } else {
                     data = [result];
                 }
            } else {
                return res.status(400).json({ success: false, error: 'XML formatı uygun değil, ürün listesi bulunamadı.' });
            }
        } else {
            return res.status(400).json({ success: false, error: 'Desteklenmeyen dosya formatı. (Sadece .xls, .xlsx, .csv, .xml)' });
        }

        if (data.length === 0) {
            return res.status(400).json({ success: false, error: 'Dosya içi boş veya okunabilir veri bulunamadı.' });
        }

        const headers = Object.keys(data[0] || {});
        return res.json({ success: true, headers, sampleData: data.slice(0, 3), rawData: data });
    } catch (error: any) {
        console.error('[BulkUpload] Parse Error:', error);
        return res.status(500).json({ success: false, error: 'Dosya okunurken hata oluştu: ' + error.message });
    }
};

export const importBulkProducts = async (req: Request, res: Response) => {
    try {
        const { products, isB2BEnabled } = req.body;
        const user = (req as any).user;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ success: false, error: 'Aktarılacak ürün bulunamadı.' });
        }

        const store = await Store.findOne({ where: { userId: user.id } });
        if (!store) {
            return res.status(400).json({ success: false, error: 'Mağazanız bulunamadı.' });
        }

        let successCount = 0;
        let failCount = 0;
        const errors: any[] = [];

        for (let i = 0; i < products.length; i++) {
            const prodData = products[i];
            
            try {
                const sku = prodData.sku || `BULK-${store.id.substring(0, 4)}-${Date.now()}-${i}`;
                const title = prodData.title || `İsimsiz Ürün ${sku}`;
                const milyem = Number(prodData.milyem || 585);
                const gramWeight = Number(prodData.gramWeight || 1);
                // default values
                const EffectiveMilyem = Number(prodData.effectiveMilyem) || milyem;
                const profitMargin = Number(prodData.profitMargin || 0);
                const quantity = Number(prodData.quantity || 10);
                const description = prodData.description || '';
                const category = prodData.category || 'Takı';
                const hasVariants = prodData.hasVariants === true || prodData.hasVariants === 'true';

                let tags: string[] = [];
                if (typeof prodData.tags === 'string') {
                    tags = prodData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
                } else if (Array.isArray(prodData.tags)) {
                    tags = prodData.tags;
                }

                let images: string[] = [];
                if (typeof prodData.images === 'string') {
                    images = prodData.images.split(',').map((img: string) => img.trim()).filter(Boolean);
                } else if (Array.isArray(prodData.images)) {
                    images = prodData.images;
                }

                const newProduct = {
                    storeId: store.id,
                    title,
                    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + sku.toLowerCase(),
                    description,
                    category,
                    sku,
                    gramWeight,
                    milyem,
                    effectiveMilyem: EffectiveMilyem,
                    gramHas: gramWeight * (EffectiveMilyem / 1000),
                    profitMargin,
                    priceTRY: 0, // Will be calculated by gold price cron or explicitly later
                    priceUSD: 0,
                    isB2BEnabled: Boolean(isB2BEnabled), // from external checkbox
                    b2bDiscount: Number(prodData.b2bDiscount || 0),
                    b2bPrice: 0,
                    quantity,
                    images,
                    tags,
                    hasVariants,
                    isActive: true,
                    marketplaceConfig: {}
                };

                const extProd = await Product.findOne({ where: { sku: newProduct.sku, storeId: store.id } });
                if (extProd) {
                    await extProd.update(newProduct);
                } else {
                    await Product.create(newProduct as any);
                }

                successCount++;
            } catch (err: any) {
                failCount++;
                errors.push(`Satır ${i + 1}: ${err.message}`);
                console.warn(`Bulk Import Error row ${i}:`, err.message);
            }
        }

        return res.json({
            success: true,
            message: `${successCount} ürün eklendi/güncellendi. ${failCount} ürün aktarılamadı.`,
            stats: { success: successCount, failed: failCount, errors }
        });

    } catch (error: any) {
        console.error('[BulkUpload] Import Error:', error);
        return res.status(500).json({ success: false, error: 'Ürünler kaydedilirken hata oluştu: ' + error.message });
    }
};

export default { parseBulkFile, importBulkProducts };
