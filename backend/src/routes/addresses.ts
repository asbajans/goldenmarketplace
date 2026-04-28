/**
 * Addresses Routes
 * Customer saved addresses CRUD
 */

import { Request, Response } from 'express';
const express = require('express');
const router = express.Router();
const UserAddress = require('../models/UserAddress').default;

function extractUser(req: any): { id: string; email: string; userType: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return null;

  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.id) return decoded;
  } catch (e) {
    // ignore
  }
  return null;
}

// GET /api/addresses - List user's addresses
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const addresses = await UserAddress.findAll({
      where: { userId: user.id },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.json({ addresses });
  } catch (error: any) {
    console.error('[Addresses GET] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/addresses - Add a new address
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, fullName, address, city, district, postalCode, country, phone, isDefault } = req.body;

    if (!name || !address || !city || !phone) {
      return res.status(400).json({ error: 'name, address, city and phone are required' });
    }

    // If setting as default, unset others first
    if (isDefault) {
      await UserAddress.update({ isDefault: false }, { where: { userId: user.id } });
    }

    // If this is the first address, make it default automatically
    const count = await UserAddress.count({ where: { userId: user.id } });
    const makeDefault = isDefault || count === 0;

    const newAddress = await UserAddress.create({
      userId: user.id,
      name: name || 'Address',
      fullName: fullName || name,
      address,
      city,
      district: district || null,
      postalCode: postalCode || null,
      country: country || 'Turkey',
      phone,
      isDefault: makeDefault
    });

    return res.status(201).json({ success: true, address: newAddress });
  } catch (error: any) {
    console.error('[Addresses POST] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/addresses/:id - Update an address
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const addr = await UserAddress.findOne({ where: { id: req.params.id, userId: user.id } });
    if (!addr) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const { name, fullName, address, city, district, postalCode, country, phone, isDefault } = req.body;

    if (isDefault) {
      await UserAddress.update({ isDefault: false }, { where: { userId: user.id } });
    }

    await addr.update({
      name: name ?? addr.name,
      fullName: fullName ?? addr.fullName,
      address: address ?? addr.address,
      city: city ?? addr.city,
      district: district ?? addr.district,
      postalCode: postalCode ?? addr.postalCode,
      country: country ?? addr.country,
      phone: phone ?? addr.phone,
      isDefault: isDefault ?? addr.isDefault
    });

    return res.json({ success: true, address: addr });
  } catch (error: any) {
    console.error('[Addresses PUT] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/addresses/:id - Delete an address
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const addr = await UserAddress.findOne({ where: { id: req.params.id, userId: user.id } });
    if (!addr) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await addr.destroy();
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Addresses DELETE] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
