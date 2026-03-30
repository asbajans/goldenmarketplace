
// import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { User, Store, Product, SubscriptionPlan, Category } from '../models';
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

        // 3. Create Products (gram + milyem based)
        console.log('🔄 Creating products...');
        const products = [
            {
                title: '22 Ayar Altın Bilezik',
                description: 'Geleneksel motifli 22 ayar altın bilezik. 15 gram.',
                category: 'Bilezik',
                gramWeight: 15.0,
                milyem: 916,
                quantity: 10,
                images: [],
                sku: 'BLZ-001'
            },
            {
                title: 'Çeyrek Altınlı Kolye',
                description: 'Yeni tarihli çeyrek altınlı zarif kolye.',
                category: 'Kolye',
                gramWeight: 1.75,
                milyem: 999,
                quantity: 50,
                images: [],
                sku: 'KLY-002'
            },
            {
                title: 'Tektaş Pırlanta Yüzük',
                description: '0.50 karat G renk tektaş yüzük. 14 ayar.',
                category: 'Yüzük',
                gramWeight: 3.5,
                milyem: 585,
                quantity: 5,
                images: [],
                sku: 'YZK-003'
            }
        ];

        for (const p of products) {
            // Calculate initial prices (mock: ~2090 TRY per 24K gram)
            const gold24KGramTRY = 2090;
            const usdTryRate = 38.5;
            const priceTRY = p.gramWeight * (p.milyem / 1000) * gold24KGramTRY;
            const priceUSD = priceTRY / usdTryRate;

            await Product.create({
                storeId: store.id,
                title: p.title,
                slug: p.title.toLowerCase().replace(/\s+/g, '-').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c'),
                description: p.description,
                category: p.category,
                gramWeight: p.gramWeight,
                milyem: p.milyem,
                profitMargin: 0,
                priceTRY: Math.round(priceTRY * 100) / 100,
                priceUSD: Math.round(priceUSD * 100) / 100,
                isB2BEnabled: false,
                b2bDiscount: 0,
                b2bPrice: Math.round(priceTRY * 100) / 100,
                quantity: p.quantity,
                images: p.images,
                sku: p.sku,
                hasVariants: false,
                isActive: true
            });
        }

        console.log('✅ Products created.');

        // 4. Create Subscription Plans
        console.log('🔄 Creating subscription plans...');
        await SubscriptionPlan.bulkCreate([
            {
                name: 'Bronz',
                description: 'Yeni başlayanlar için ideal',
                monthlyPrice: 99.00,
                yearlyPrice: 990.00,
                currency: 'TRY',
                interval: 'month',
                productLimit: 50,
                integrationLimit: 1,
                features: ['50 Ürün Listeleme', 'Temel İstatistikler', 'Standart Destek'],
                isActive: true
            },
            {
                name: 'Gümüş',
                description: 'Büyüyen işletmeler için',
                monthlyPrice: 199.00,
                yearlyPrice: 1990.00,
                currency: 'TRY',
                interval: 'month',
                productLimit: 200,
                integrationLimit: 3,
                features: ['200 Ürün Listeleme', 'Gelişmiş İstatistikler', 'Öncelikli Destek', 'Reklam Kredisi'],
                isActive: true
            },
            {
                name: 'Altın',
                description: 'Profesyonel satıcılar için',
                monthlyPrice: 399.00,
                yearlyPrice: 3990.00,
                currency: 'TRY',
                interval: 'month',
                productLimit: 1000,
                integrationLimit: 10,
                features: ['Sınırsız Ürün', 'VIP Destek', 'Altın Endeksli Reklam', 'Tüm Hazır Entegrasyonlar'],
                isActive: true
            }
        ]);
        console.log('✅ Subscription plans created.');

        // 5. Create Categories
        console.log('🔄 Creating categories...');
        await Category.bulkCreate([
            { name: 'Yüzük', slug: 'yuzuk', isActive: true },
            { name: 'Kolye', slug: 'kolye', isActive: true },
            { name: 'Bilezik', slug: 'bilezik', isActive: true },
            { name: 'Küpe', slug: 'kupe', isActive: true },
            { name: 'Saat', slug: 'saat', isActive: true }
        ]);
        console.log('✅ Categories created.');

        console.log('🎉 Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seed();
