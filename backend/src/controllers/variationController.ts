import { Request, Response } from 'express';
import { Variation, VariationOption } from '../models';

export class VariationController {
  /**
   * Get all variations and their options for the current user
   */
  static async getVariations(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const variations = await Variation.findAll({
        where: { userId: user.id, isActive: true },
        include: [{ model: VariationOption, as: 'options' }],
        order: [['createdAt', 'DESC'], [{ model: VariationOption, as: 'options' }, 'orderIndex', 'ASC']]
      });

      return res.status(200).json(variations);
    } catch (error) {
      console.error('Get variations error:', error);
      return res.status(500).json({ error: { message: 'Internal server error', status: 500 } });
    }
  }

  /**
   * Create a new variation with its options
   */
  static async createVariation(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { name, options } = req.body;

      if (!name) {
        return res.status(400).json({ error: { message: 'Varyasyon adı zorunludur.', status: 400 } });
      }

      const variation = await Variation.create({
        userId: user.id,
        name,
        isActive: true
      });

      if (Array.isArray(options) && options.length > 0) {
        const optionRecords = options.map((opt: any, index: number) => ({
          variationId: variation.id,
          value: typeof opt === 'string' ? opt : opt.value,
          orderIndex: index
        }));
        await VariationOption.bulkCreate(optionRecords);
      }

      // Reload to include options
      const createdWithOptions = await Variation.findByPk(variation.id, {
        include: [{ model: VariationOption, as: 'options' }]
      });

      return res.status(201).json({
        message: 'Varyasyon başarıyla oluşturuldu',
        variation: createdWithOptions
      });
    } catch (error) {
      console.error('Create variation error:', error);
      return res.status(500).json({ error: { message: 'Internal server error', status: 500 } });
    }
  }

  /**
   * Update variation and options
   */
  static async updateVariation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { name, options } = req.body;

      const variation = await Variation.findOne({ where: { id, userId: user.id } });
      if (!variation) {
        return res.status(404).json({ error: { message: 'Varyasyon bulunamadı', status: 404 } });
      }

      if (name) {
        await variation.update({ name });
      }

      if (Array.isArray(options)) {
        // Simple replace all for options
        await VariationOption.destroy({ where: { variationId: id } });
        if (options.length > 0) {
          const optionRecords = options.map((opt: any, index: number) => ({
            variationId: variation.id,
            value: typeof opt === 'string' ? opt : opt.value,
            orderIndex: index
          }));
          await VariationOption.bulkCreate(optionRecords);
        }
      }

      const updated = await Variation.findByPk(id, {
        include: [{ model: VariationOption, as: 'options' }],
        order: [[{ model: VariationOption, as: 'options' }, 'orderIndex', 'ASC']]
      });

      return res.status(200).json({
        message: 'Varyasyon güncellendi',
        variation: updated
      });
    } catch (error) {
      console.error('Update variation error:', error);
      return res.status(500).json({ error: { message: 'Internal server error', status: 500 } });
    }
  }

  /**
   * Delete a variation
   */
  static async deleteVariation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const variation = await Variation.findOne({ where: { id, userId: user.id } });
      if (!variation) {
        return res.status(404).json({ error: { message: 'Varyasyon bulunamadı', status: 404 } });
      }

      // cascading deletes will handle options, but just to be safe
      await VariationOption.destroy({ where: { variationId: id } });
      await variation.destroy();

      return res.status(200).json({ message: 'Varyasyon silindi' });
    } catch (error) {
      console.error('Delete variation error:', error);
      return res.status(500).json({ error: { message: 'Internal server error', status: 500 } });
    }
  }
}

export default VariationController;
