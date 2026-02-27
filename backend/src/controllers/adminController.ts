import { Request, Response } from 'express';
import User from '../models/User';
import Store from '../models/Store';
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
            const plans = await SubscriptionPlan.findAll({ order: [['priceTRY', 'ASC']] });
            return res.json(plans);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch subscription plans' });
        }
    }

    static async createSubscriptionPlan(req: Request, res: Response): Promise<Response> {
        try {
            const { name, description, priceTRY, productLimit, features, isActive } = req.body;
            const plan = await SubscriptionPlan.create({ name, description, priceTRY, productLimit, features, isActive });
            return res.status(201).json(plan);
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to create subscription plan' });
        }
    }

    static async updateSubscriptionPlan(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { name, description, priceTRY, productLimit, features, isActive } = req.body;

            const plan = await SubscriptionPlan.findByPk(id);
            if (!plan) return res.status(404).json({ error: 'Plan not found' });

            await plan.update({ name, description, priceTRY, productLimit, features, isActive });
            return res.json(plan);
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
            return res.status(500).json({ error: 'Failed to fetch integrations' });
        }
    }
}

export default AdminController;
