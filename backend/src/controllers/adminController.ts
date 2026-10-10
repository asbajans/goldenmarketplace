import { Request, Response } from 'express';
import User from '../models/User';
import Store from '../models/Store';
import Product from '../models/Product';
import Category from '../models/Category';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Integration from '../models/Integration';
import IntegrationLog from '../models/IntegrationLog';
import PasswordService from '../utils/password';


export class AdminController {
    // --- USERS ---
    static async getUsers(_req: Request, res: Response): Promise<Response> {
        try {
            const users = await User.findAll({ order: [['createdAt', 'DESC']] });
            return res.json(users);
        } catch (error) {
            console.error('Admin Error [getUsers]:', error);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    static async createUser(req: Request, res: Response): Promise<Response> {
        try {
            const { email, password, firstName, lastName, userType, phone, isActive } = req.body;
            const hashedPassword = await PasswordService.hashPassword(password);

            const user = await User.create({
                email,
                password: hashedPassword,
                firstName,
                lastName,
                userType,
                phone,
                isActive
            });
            return res.status(201).json(user);
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to create user' });
        }
    }

    static async updateUser(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { email, firstName, lastName, userType, phone, isActive, password } = req.body;

            const user = await User.findByPk(id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const wasInactive = !user.isActive;
            let updateData: any = { email, firstName, lastName, userType, phone, isActive };

            if (password) {
                updateData.password = await PasswordService.hashPassword(password);
            }

            await user.update(updateData);

            // Auto-create store if seller is activated and has a pending store name
            if (wasInactive && isActive && user.userType === 'seller' && user.pendingStoreName) {
                const existingStore = await Store.findOne({ where: { userId: user.id } });
                if (!existingStore) {
                    await Store.create({
                        userId: user.id,
                        storeName: user.pendingStoreName,
                        storeSlug: user.pendingStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                        isActive: true
                    } as any);
                    await user.update({ pendingStoreName: null } as any);
                }
            }

            return res.json(user);
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to update user' });
        }
    }

    static async deleteUser(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const user = await User.findByPk(id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            await user.destroy();
            return res.json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete user' });
        }
    }

    // --- STORES (Sellers) ---
    static async getStores(_req: Request, res: Response): Promise<Response> {
        try {
            const stores = await Store.findAll({
                include: [{ model: User, as: 'user' }],
                order: [['createdAt', 'DESC']]
            });
            return res.json(stores);
        } catch (error) {
            console.error('Admin Error [getStores]:', error);
            return res.status(500).json({ error: 'Failed to fetch stores' });
        }
    }

    static async createStore(req: Request, res: Response): Promise<Response> {
        try {
            const { userId, storeName, storeSlug, description, isActive, commissionRate, defaultShippingDays } = req.body;
            const store = await Store.create({
                userId,
                storeName,
                storeSlug,
                description,
                isActive,
                rating: 0,
                totalProducts: 0,
                commissionRate: commissionRate || 10,
                defaultShippingDays: defaultShippingDays || 3
            });
            return res.status(201).json(store);
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to create store' });
        }
    }

    static async updateStore(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { storeName, storeSlug, description, isActive } = req.body;

            const store = await Store.findByPk(id);
            if (!store) return res.status(404).json({ error: 'Store not found' });

            await store.update({ storeName, storeSlug, description, isActive });
            return res.json(store);
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to update store' });
        }
    }

    static async deleteStore(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const store = await Store.findByPk(id);
            if (!store) return res.status(404).json({ error: 'Store not found' });

            await store.destroy();
            return res.json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete store' });
        }
    }

    // --- CATEGORIES ---
    static async getCategories(_req: Request, res: Response): Promise<Response> {
        try {
            const categories = await Category.findAll({ order: [['name', 'ASC']] });
            return res.json(categories);
        } catch (error) {
            console.error('Admin Error [getCategories]:', error);
            return res.status(500).json({ error: 'Failed to fetch categories' });
        }
    }

    static async createCategory(req: Request, res: Response): Promise<Response> {
        try {
            const { name, slug, description, isActive, translations } = req.body;
            const category = await Category.create({ name, slug, description, isActive, translations: translations || {} });
            return res.status(201).json(category);
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to create category' });
        }
    }

    static async updateCategory(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { name, slug, description, isActive, translations } = req.body;

            const category = await Category.findByPk(id);
            if (!category) return res.status(404).json({ error: 'Category not found' });

            const existingTranslations = category.get('translations') || {};
            const mergedTranslations = { ...(typeof existingTranslations === 'object' ? existingTranslations : {}), ...(translations || {}) };
            await category.update({ name, slug, description, isActive, translations: mergedTranslations });
            return res.json(category);
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to update category' });
        }
    }

    static async deleteCategory(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const category = await Category.findByPk(id);
            if (!category) return res.status(404).json({ error: 'Category not found' });

            await category.destroy();
            return res.json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete category' });
        }
    }

    // --- SUBSCRIPTION PLANS ---
    static async getSubscriptionPlans(_req: Request, res: Response): Promise<Response> {
        try {
            const plans = await SubscriptionPlan.findAll({ order: [['monthlyPrice', 'ASC']] });
            return res.json(plans);
        } catch (error) {
            console.error('Admin Error [getSubscriptionPlans]:', error);
            return res.status(500).json({ error: 'Failed to fetch subscription plans' });
        }
    }

    static async createSubscriptionPlan(req: Request, res: Response): Promise<Response> {
        try {
            const { name, description, monthlyPrice, yearlyPrice, currency, interval, productLimit, integrationLimit, aiTranslationEnabled, aiContentEnabled, aiMonthlyCredit, b2bEnabled, bulkUploadEnabled, maxExternalFeeds, features, stripePriceId, stripePriceIdYearly, isActive } = req.body;
            const plan = await SubscriptionPlan.create({
                name,
                description,
                monthlyPrice,
                yearlyPrice,
                currency,
                interval,
                productLimit,
                integrationLimit,
                aiTranslationEnabled: aiTranslationEnabled || false,
                aiContentEnabled: aiContentEnabled || false,
                aiMonthlyCredit: aiMonthlyCredit || 0,
                b2bEnabled: b2bEnabled || false,
                bulkUploadEnabled: bulkUploadEnabled || false,
                maxExternalFeeds: maxExternalFeeds ?? 0,
                features,
                stripePriceId,
                stripePriceIdYearly,
                isActive: isActive !== undefined ? isActive : true
            });
            return res.status(201).json(plan);
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to create subscription plan' });
        }
    }

    static async updateSubscriptionPlan(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, description, monthlyPrice, yearlyPrice, currency, interval, productLimit, integrationLimit, aiTranslationEnabled, aiContentEnabled, aiMonthlyCredit, b2bEnabled, bulkUploadEnabled, maxExternalFeeds, features, stripePriceId, stripePriceIdYearly, isActive } = req.body;
            const plan = await SubscriptionPlan.findByPk(id);
            if (!plan) {
                return res.status(404).json({ error: 'Plan not found' });
            }
            await plan.update({
                name,
                description,
                monthlyPrice,
                yearlyPrice,
                currency,
                interval,
                productLimit,
                integrationLimit,
                aiTranslationEnabled: aiTranslationEnabled !== undefined ? aiTranslationEnabled : plan.aiTranslationEnabled,
                aiContentEnabled: aiContentEnabled !== undefined ? aiContentEnabled : plan.aiContentEnabled,
                aiMonthlyCredit: aiMonthlyCredit !== undefined ? aiMonthlyCredit : plan.aiMonthlyCredit,
                b2bEnabled: b2bEnabled !== undefined ? b2bEnabled : plan.b2bEnabled,
                bulkUploadEnabled: bulkUploadEnabled !== undefined ? bulkUploadEnabled : plan.bulkUploadEnabled,
                maxExternalFeeds: maxExternalFeeds !== undefined ? maxExternalFeeds : plan.maxExternalFeeds,
                features,
                stripePriceId,
                stripePriceIdYearly: stripePriceIdYearly !== undefined ? stripePriceIdYearly : plan.stripePriceIdYearly,
                isActive
            });
            return res.status(200).json(plan);
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to update subscription plan' });
        }
    }

    static async deleteSubscriptionPlan(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const plan = await SubscriptionPlan.findByPk(id);
            if (!plan) return res.status(404).json({ error: 'Plan not found' });

            await plan.destroy();
            return res.json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to delete subscription plan' });
        }
    }

    // --- INTEGRATIONS ---
    static async getIntegrations(_req: Request, res: Response): Promise<Response> {
        try {
            const integrations = await Integration.findAll({
                include: [{ model: Store, as: 'store' }],
                order: [['createdAt', 'DESC']]
            });
            return res.json(integrations);
        } catch (error: any) {
            console.error('Admin Error [getIntegrations]:', error);
            return res.status(500).json({ error: 'Failed to fetch integrations' });
        }
    }

    static async getIntegrationLogs(req: Request, res: Response): Promise<Response> {
        try {
            const limit = parseInt(req.query.limit as string) || 100;
            const offset = parseInt(req.query.offset as string) || 0;
            const { platform, isSuccess, userId } = req.query;

            let where: any = {};
            if (platform) where.platform = platform;
            if (isSuccess !== undefined) where.isSuccess = isSuccess === 'true';
            if (userId) where.userId = userId;

            const { count, rows } = await IntegrationLog.findAndCountAll({
                where,
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });

            return res.json({
                total: count,
                logs: rows,
                page: Math.floor(offset / limit) + 1,
                pages: Math.ceil(count / limit)
            });
        } catch (error: any) {
            console.error('Admin Error [getIntegrationLogs]:', error);
            return res.status(500).json({ error: 'Failed to fetch integration logs' });
        }
    }
    // --- ALL PRODUCTS (Admin) ---
    static async getAllProducts(req: Request, res: Response): Promise<Response> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = (page - 1) * limit;
            const search = req.query.search as string;
            const storeId = req.query.storeId as string;

            const where: any = {};
            if (storeId) where.storeId = storeId;
            if (search) {
                const { Op } = require('sequelize');
                where.title = { [Op.iLike]: `%${search}%` };
            }

            const { count, rows: products } = await Product.findAndCountAll({
                where,
                attributes: [
                    'id', 'title', 'sku', 'category', 'gramWeight', 'milyem',
                    'effectiveMilyem', 'gramHas', 'priceTRY', 'priceUSD',
                    'b2bPrice', 'b2bDiscount', 'isB2BEnabled', 'quantity',
                    'images', 'isActive', 'profitMargin', 'storeId',
                    'hasVariants', 'marketplaces', 'gender', 'ageGroup', 'color',
                    'ratingAverage', 'ratingCount', 'createdAt'
                ],
                include: [{
                    model: Store,
                    as: 'store',
                    attributes: [
                        'id',
                        ['storeName', 'name'],
                        ['storeName', 'storeName']
                    ]
                }],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            return res.json({
                data: products,
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            });
        } catch (error) {
            console.error('Admin Error [getAllProducts]:', error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }
    }

    static async updateProductByAdmin(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const product = await Product.findByPk(id);
            if (!product) return res.status(404).json({ error: 'Product not found' });

            const {
                title, description, category, categoryId, gramWeight, milyem, effectiveMilyem,
                profitMargin, isB2BEnabled, b2bDiscount, quantity, isActive,
                images, marketplaces, gender, ageGroup, color
            } = req.body;

            const FEED_GENDERS = ['male', 'female', 'unisex'];
            const FEED_AGE_GROUPS = ['newborn', 'infant', 'toddler', 'kids', 'adult'];
            if (gender !== undefined && gender !== null && gender !== '' && !FEED_GENDERS.includes(String(gender).toLowerCase())) {
                return res.status(400).json({ error: `Geçersiz gender. İzin verilenler: ${FEED_GENDERS.join(', ')}` });
            }
            if (ageGroup !== undefined && ageGroup !== null && ageGroup !== '' && !FEED_AGE_GROUPS.includes(String(ageGroup).toLowerCase())) {
                return res.status(400).json({ error: `Geçersiz ageGroup. İzin verilenler: ${FEED_AGE_GROUPS.join(', ')}` });
            }

            // If categoryId is provided, derive the raw category string from the Category record
            let finalCategory = category ?? product.category;
            let finalCategoryId = categoryId !== undefined ? categoryId : product.categoryId;
            if (categoryId) {
                const Category = require('../models/Category').default;
                const cat = await Category.findByPk(categoryId);
                if (cat) {
                    finalCategory = cat.slug;
                    finalCategoryId = cat.id;
                }
            } else if (category && category !== product.category) {
                finalCategoryId = null;
            }

            const goldPriceService = require('../services/goldPriceService').default;
            const isFixedAdmin = (product as any).pricingType === 'fixed';
            const finalMilyem = milyem ?? product.milyem;
            const finalEffective = !isFixedAdmin && (effectiveMilyem && finalMilyem && effectiveMilyem >= finalMilyem) ? effectiveMilyem : (isFixedAdmin ? null : finalMilyem);
            const finalGram = gramWeight ?? product.gramWeight;
            const finalMargin = profitMargin ?? product.profitMargin;
            let gramHas: number | null = null;
            let priceTRY: number = Number(product.priceTRY);
            let priceUSD: number = Number(product.priceUSD);
            if (!isFixedAdmin && finalGram && finalEffective) {
              gramHas = Math.round(Number(finalGram) * (Number(finalEffective) / 1000) * 10000) / 10000;
              const calc = await goldPriceService.calculateProductPrice(Number(finalGram), Number(finalEffective), finalMargin);
              priceTRY = calc.priceTRY;
              priceUSD = calc.priceUSD;
            }
            const finalIsB2B = isB2BEnabled !== undefined ? !!isB2BEnabled : product.isB2BEnabled;
            const finalDiscount = b2bDiscount ?? product.b2bDiscount;
            const b2bPrice = finalIsB2B ? Math.round(priceTRY * (1 - finalDiscount / 100) * 100) / 100 : 0;

            await product.update({
                title: title ?? product.title,
                description: description ?? product.description,
                category: finalCategory,
                categoryId: finalCategoryId,
                gramWeight: finalGram,
                milyem: finalMilyem,
                effectiveMilyem: finalEffective,
                gramHas,
                profitMargin: finalMargin,
                priceTRY,
                priceUSD,
                isB2BEnabled: finalIsB2B,
                b2bDiscount: finalDiscount,
                b2bPrice,
                quantity: quantity ?? product.quantity,
                isActive: isActive ?? product.isActive,
                images: images ?? product.images,
                marketplaces: marketplaces ?? product.marketplaces,
                gender: gender === undefined ? product.gender : (gender === '' || gender === null ? null : String(gender).toLowerCase()),
                ageGroup: ageGroup === undefined ? product.ageGroup : (ageGroup === '' || ageGroup === null ? null : String(ageGroup).toLowerCase()),
                color: color === undefined ? product.color : (color === '' || color === null ? null : String(color).trim()),
            });
            return res.json(product);
        } catch (error: any) {
            console.error('Admin Error [updateProductByAdmin]:', error);
            return res.status(400).json({ error: error.message || 'Failed to update product' });
        }
    }

    /**
     * POST /api/admin/products/backfill-feed-attributes
     * Değeri boş olan tüm ürünlere feed varsayılanlarını yazar.
     * Body ile override edilebilir: { gender, ageGroup, color }
     * Verilmezse GlobalSetting'deki feed_default_* kullanılır.
     */
    static async backfillFeedAttributes(req: Request, res: Response): Promise<Response> {
        try {
            const { Op } = require('sequelize');
            const { GlobalSetting } = require('../models/GlobalSetting');
            const settings = await GlobalSetting.findAll({
                where: { key: { [Op.in]: ['feed_default_gender', 'feed_default_age_group', 'feed_default_color'] } }
            });
            const map: Record<string, string> = {};
            for (const s of settings) map[s.key] = s.value;

            const gender = req.body?.gender !== undefined ? String(req.body.gender).toLowerCase() : String(map.feed_default_gender || 'unisex').toLowerCase();
            const ageGroup = req.body?.ageGroup !== undefined ? String(req.body.ageGroup).toLowerCase() : String(map.feed_default_age_group || 'adult').toLowerCase();
            const color = req.body?.color !== undefined ? String(req.body.color).trim() : String(map.feed_default_color || 'Gold').trim();

            const FEED_GENDERS = ['male', 'female', 'unisex'];
            const FEED_AGE_GROUPS = ['newborn', 'infant', 'toddler', 'kids', 'adult'];
            if (!FEED_GENDERS.includes(gender)) return res.status(400).json({ error: `Geçersiz gender: ${gender}` });
            if (!FEED_AGE_GROUPS.includes(ageGroup)) return res.status(400).json({ error: `Geçersiz ageGroup: ${ageGroup}` });
            if (!color) return res.status(400).json({ error: 'Geçersiz color: boş olamaz' });

            const candidates = await Product.findAll({
                where: {
                    [Op.or]: [
                        { gender: { [Op.or]: [null, ''] } },
                        { ageGroup: { [Op.or]: [null, ''] } },
                        { color: { [Op.or]: [null, ''] } }
                    ]
                },
                attributes: ['id', 'gender', 'ageGroup', 'color']
            });
            let updated = 0;
            for (const p of candidates) {
                const patch: any = {};
                if (!p.gender) patch.gender = gender;
                if (!p.ageGroup) patch.ageGroup = ageGroup;
                if (!p.color) patch.color = color;
                if (Object.keys(patch).length > 0) {
                    await p.update(patch);
                    updated++;
                }
            }
            return res.json({ success: true, updated, scanned: candidates.length, applied: { gender, ageGroup, color } });
        } catch (error: any) {
            console.error('Admin Error [backfillFeedAttributes]:', error);
            return res.status(500).json({ error: error.message || 'Backfill failed' });
        }
    }

    // --- USER PLAN ASSIGNMENT ---
    static async assignPlanToUser(req: Request, res: Response): Promise<Response> {        try {
            const { id } = req.params;
            const { subscriptionPlanId, subscriptionStatus } = req.body;

            const user = await User.findByPk(id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            let planName: string | undefined;
            if (subscriptionPlanId) {
                const plan = await SubscriptionPlan.findByPk(subscriptionPlanId);
                if (!plan) return res.status(404).json({ error: 'Subscription plan not found' });
                planName = plan.name;
            }

            // Calculate end date (+30 days)
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);

            await user.update({
                subscriptionPlan: planName || user.subscriptionPlan,
                subscriptionStatus: subscriptionStatus || 'active',
                subscriptionEndDate: endDate
            } as any);

            return res.json({ success: true, user });
        } catch (error: any) {
            console.error('Admin Error [assignPlanToUser]:', error);
            return res.status(500).json({ error: error.message || 'Failed to assign plan' });
        }
    }

    // --- PAYMENTS (abonelik + kredi onayları) ---
    static async getPayments(req: Request, res: Response): Promise<Response> {
        try {
            const { status, kind } = req.query;
            const where: any = {};
            if (status) where.status = status;
            if (kind) where.kind = kind;
            const { default: Payment } = await import('../models/Payment');
            const payments = await Payment.findAll({
                where,
                order: [['createdAt', 'DESC']],
                limit: 100
            });
            return res.json(payments);
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Failed to fetch payments' });
        }
    }

    static async approvePayment(req: Request, res: Response): Promise<Response> {
        try {
            const paymentService = await import('../services/paymentService');
            const adminId = (req as any).user?.id;
            const payment = await paymentService.approvePayment(req.params.id, adminId);
            return res.json({ success: true, payment });
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Onay başarısız' });
        }
    }

    static async rejectPayment(req: Request, res: Response): Promise<Response> {
        try {
            const paymentService = await import('../services/paymentService');
            const adminId = (req as any).user?.id;
            const payment = await paymentService.rejectPayment(req.params.id, adminId, req.body?.reason);
            return res.json({ success: true, payment });
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Red başarısız' });
        }
    }

    // --- USER CREDITS (haricen kredi tanımlama) ---
    static async getUserCredits(req: Request, res: Response): Promise<Response> {
        try {
            const { default: CreditTransaction } = await import('../models/CreditTransaction');
            const { default: planAccessService } = await import('../services/planAccessService');
            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            const balance = await planAccessService.getCreditBalance(req.params.id);
            const transactions = await CreditTransaction.findAll({
                where: { userId: req.params.id },
                order: [['createdAt', 'DESC']],
                limit: 50
            });
            return res.json({ balance, transactions });
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Failed to fetch credits' });
        }
    }

    static async grantUserCredits(req: Request, res: Response): Promise<Response> {
        try {
            const paymentService = await import('../services/paymentService');
            const adminId = (req as any).user?.id;
            const { credits, reason } = req.body;
            const result = await paymentService.grantCreditsByAdmin(req.params.id, Number(credits), reason || '', adminId);
            return res.json({ success: true, ...result });
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Kredi tanımlanamadı' });
        }
    }
}

export default AdminController;
