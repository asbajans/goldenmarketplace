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
            const { name, description, monthlyPrice, yearlyPrice, currency, interval, productLimit, integrationLimit, aiTranslationEnabled, aiContentEnabled, aiMonthlyCredit, features, stripePriceId, isActive } = req.body;
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
                features,
                stripePriceId,
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
            const { name, description, monthlyPrice, yearlyPrice, currency, interval, productLimit, integrationLimit, aiTranslationEnabled, aiContentEnabled, aiMonthlyCredit, features, stripePriceId, isActive } = req.body;
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
                features,
                stripePriceId,
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
                    'hasVariants', 'marketplaces', 'createdAt'
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
                title, description, category, gramWeight, milyem, effectiveMilyem,
                profitMargin, isB2BEnabled, b2bDiscount, quantity, isActive,
                images, marketplaces
            } = req.body;

            const goldPriceService = require('../services/goldPriceService').default;
            const finalMilyem = milyem ?? product.milyem;
            const finalEffective = (effectiveMilyem && effectiveMilyem >= finalMilyem) ? effectiveMilyem : finalMilyem;
            const finalGram = gramWeight ?? product.gramWeight;
            const finalMargin = profitMargin ?? product.profitMargin;
            const gramHas = Math.round(finalGram * (finalEffective / 1000) * 10000) / 10000;
            const { priceTRY, priceUSD } = await goldPriceService.calculateProductPrice(finalGram, finalEffective, finalMargin);
            const finalIsB2B = isB2BEnabled !== undefined ? !!isB2BEnabled : product.isB2BEnabled;
            const finalDiscount = b2bDiscount ?? product.b2bDiscount;
            const b2bPrice = finalIsB2B ? Math.round(priceTRY * (1 - finalDiscount / 100) * 100) / 100 : 0;

            await product.update({
                title: title ?? product.title,
                description: description ?? product.description,
                category: category ?? product.category,
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
            });
            return res.json(product);
        } catch (error: any) {
            console.error('Admin Error [updateProductByAdmin]:', error);
            return res.status(400).json({ error: error.message || 'Failed to update product' });
        }
    }

    // --- USER PLAN ASSIGNMENT ---
    static async assignPlanToUser(req: Request, res: Response): Promise<Response> {
        try {
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
}

export default AdminController;
