/**
 * Wishlist Routes
 * Customer wishlist operations
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import Product from '../models/Product';
import Wishlist from '../models/Wishlist';

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const wishlists = await Wishlist.findAll({
      where: { userId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'title', 'price', 'image', 'storeSlug']
      }],
      order: [['createdAt', 'DESC']]
    });

    const wishlist = wishlists.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      title: item.product?.title,
      price: item.product?.price,
      image: item.product?.image,
      storeSlug: item.product?.storeSlug,
      createdAt: item.createdAt
    }));

    res.json({ wishlist });
  } catch (error: any) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { productId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!productId) {
      res.status(400).json({ error: 'productId is required' });
      return;
    }

    const existing = await Wishlist.findOne({ where: { userId, productId } });
    if (existing) {
      res.json({ message: 'Already in wishlist', wishlist: existing });
      return;
    }

    const wishlistItem = await Wishlist.create({ userId, productId });
    res.json({ message: 'Added to wishlist', wishlist: wishlistItem });
  } catch (error: any) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { productId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!productId) {
      res.status(400).json({ error: 'productId is required' });
      return;
    }

    await Wishlist.destroy({ where: { userId, productId } });
    res.json({ message: 'Removed from wishlist' });
  } catch (error: any) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;