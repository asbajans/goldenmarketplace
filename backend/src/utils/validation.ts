/**
 * Validation Utilities
 * Input validation and sanitization
 */

import Joi from 'joi';

export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    userType: Joi.string().valid('seller', 'customer', 'admin')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createStore: Joi.object({
    storeName: Joi.string().required(),
    storeSlug: Joi.string().required(),
    description: Joi.string()
  }),

  createProduct: Joi.object({
    storeId: Joi.string().uuid().required(),
    title: Joi.string().required(),
    description: Joi.string(),
    category: Joi.string().required(),
    sku: Joi.string().required(),
    basePrice: Joi.number().positive().required(),
    quantity: Joi.number().integer().required(),
    images: Joi.array().items(Joi.string().uri())
  }),

  createSubscription: Joi.object({
    marketplace: Joi.string().required(),
    plan: Joi.string().valid('basic', 'professional', 'enterprise').required(),
    paymentMethodId: Joi.string()
  })
};

export const validateRequest = (schema: Joi.Schema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: {
          message: error.details[0].message,
          status: 400
        }
      });
    }

    req.validatedBody = value;
    next();
  };
};
