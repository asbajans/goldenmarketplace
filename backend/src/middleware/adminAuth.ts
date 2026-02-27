import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

export const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
        // @ts-ignore
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await User.findByPk(userId);

        if (!user || user.userType !== 'admin') {
            return res.status(403).json({ error: 'Forbidden. Admin access required.' });
        }

        next();
    } catch (error) {
        console.error('Admin Auth Middleware Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
