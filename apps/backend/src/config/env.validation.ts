import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .custom((value, helper) => {
      if (!value.includes('connection_limit=')) {
        return helper.error('DATABASE_URL must include connection_limit=5 for 1GB RAM', { value });
      }
      return value;
    }),
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'JWT_SECRET must be at least 32 characters',
      'any.required': 'JWT_SECRET is required',
    }),
  JWT_EXPIRATION: Joi.string().default('15m'),
  REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'REFRESH_SECRET must be at least 32 characters',
    }),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  AGENT_TOKEN_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'AGENT_TOKEN_SECRET must be at least 32 characters',
    }),
});
