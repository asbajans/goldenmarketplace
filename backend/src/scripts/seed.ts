
// import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import User from '../models/User';
import Store from '../models/Store';
import Product from '../models/Product';
import PasswordService from '../utils/password';
import sequelize from '../config/database';

dotenv.config();

const seed = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Connected.');

        // Force sync to clear DB
        console.log('🔄 Syncing models...');
        await sequelize.sync({ force: true });
        console.log('✅ Models synced.');

        // 1. Create Users
        console.log('🔄 Creating users...');

        const adminPass = await PasswordService.hashPassword('admin123');
        const sellerPass = await PasswordService.hashPassword('seller123');
        const customerPass = await PasswordService.hashPassword('customer123');

        await User.create({
            email: 'admin@golden.com',
            password: adminPass,
            firstName: 'Super',
            lastName: 'Admin',
            userType: 'admin',
            isActive: true
        });

        const seller = await User.create({
            email: 'seller@golden.com',
            password: sellerPass,
            firstName: 'Ali',
            lastName: 'Kuyumcu',
            userType: 'seller',
            isActive: true
        });

        await User.create({
            email: 'customer@golden.com',
            password: customerPass,
            firstName: 'Ayşe',
            lastName: 'Müşteri',
            userType: 'customer',
            isActive: true
        });

        console.log('✅ Users created.');

        // 2. Create Store
        console.log('🔄 Creating store...');
        const store = await Store.create({
            userId: seller.id,
            storeName: 'Golden Bazaar',
            storeSlug: 'golden-bazaar',
            description: 'En kaliteli altın ve mücevherler',
            rating: 4.8,
            totalProducts: 5,
            isActive: true
        });
        console.log('✅ Store created.');

        // 3. Create Products
        console.log('🔄 Creating products...');
        const products = [
            {
                title: '22 Ayar Altın Bilezik',
                description: 'Geleneksel motifli 22 ayar altın bilezik. 15 gram.',
                category: 'Bilezik',
                basePrice: 25000,
                goldIndexPrice: 10.5, // Approx grams or indexed value
                quantity: 10,
                images: [],
                sku: 'BLZ-001'
            },
            {
                title: 'Çeyrek Altınlı Kolye',
                description: 'Yeni tarihli çeyrek altınlı zarif kolye.',
                category: 'Kolye',
                basePrice: 5000,
                goldIndexPrice: 2.1,
                quantity: 50,
                images: [],
                sku: 'KLY-002'
            },
            {
                title: 'Tektaş Pırlanta Yüzük',
                description: '0.50 karat G renk tektaş yüzük.',
                category: 'Yüzük',
                basePrice: 45000,
                goldIndexPrice: 18.2,
                quantity: 5,
                images: [],
                sku: 'YZK-003'
            }
        ];

        for (const p of products) {
            await Product.create({
                storeId: store.id,
                title: p.title,
                slug: p.title.toLowerCase().replace(/\s+/g, '-').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c'),
                description: p.description,
                category: p.category,
                basePrice: p.basePrice,
                goldIndexPrice: p.goldIndexPrice,
                quantity: p.quantity,
                images: p.images,
                sku: p.sku,
                isActive: true
            });
        }

        console.log('✅ Products created.');
        console.log('🎉 Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seed();
