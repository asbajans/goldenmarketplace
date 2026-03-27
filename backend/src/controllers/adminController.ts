import { Request, Response } from 'express';
import User from '../models/User';
import Store from '../models/Store';
import Product from '../models/Product';
import Category from '../models/Category';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Integration from '../models/Integration';
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

            let updateData: any = { email, firstName, lastName, userType, phone, isActive };

            if (password) {
                updateData.password = await PasswordService.hashPassword(password);
            }

            await user.update(updateData);
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
            const { userId, storeName, storeSlug, description, isActive } = req.body;
            const store = await Store.create({
                userId,
                storeName,
                storeSlug,
                description,
                isActive,
                rating: 0,
                totalProducts: 0
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
            const { name, slug, description, isActive } = req.body;
            const category = await Category.create({ name, slug, description, isActive });
            return res.status(201).json(category);
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to create category' });
        }
    }

    static async updateCategory(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { name, slug, description, isActive } = req.body;

            const category = await Category.findByPk(id);
            if (!category) return res.status(404).json({ error: 'Category not found' });

            await category.update({ name, slug, description, isActive });
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
            const plans = await SubscriptionPlan.findAll({ order: [['price', 'ASC']] });
            return res.json(plans);
        } catch (error) {
            console.error('Admin Error [getSubscriptionPlans]:', error);
            return res.status(500).json({ error: 'Failed to fetch subscription plans' });
        }
    }

    static async createSubscriptionPlan(req: Request, res: Response): Promise<Response> {
        try {
            const { name, description, price, currency, interval, productLimit, features, stripePriceId, isActive } = req.body;
            const plan = await SubscriptionPlan.create({
                name,
                description,
                price,
                currency,
                interval,
                productLimit,
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
            const { name, description, price, currency, interval, productLimit, features, stripePriceId, isActive } = req.body;
            const plan = await SubscriptionPlan.findByPk(id);
            if (!plan) {
                return res.status(404).json({ error: 'Plan not found' });
            }
            await plan.update({
                name,
                description,
                price,
                currency,
                interval,
                productLimit,
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
    // --- ALL PRODUCTS (Admin) ---
    static async getAllProducts(_req: Request, res: Response): Promise<Response> {
        try {
            const products = await Product.findAll({
                include: [{ model: Store, as: 'store', attributes: ['id', ['storeName', 'name']] }],
                order: [['createdAt', 'DESC']]
            });
            return res.json({ data: products });
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
