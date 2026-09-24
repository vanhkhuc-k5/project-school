/**
 * Zod Request Validation Middleware Factory
 * Validates req.body, req.query, or req.params against Zod schemas before
 * execution reaches controllers or services.
 */

import { ValidationError } from '../errors/AppError.js';

/**
 * @param {{ body?: import('zod').ZodSchema, query?: import('zod').ZodSchema, params?: import('zod').ZodSchema }} schemas
 */
export function validateRequest(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        const parsed = schemas.body.safeParse(req.body);
        if (!parsed.success) {
          const firstIssue = parsed.error.issues[0];
          const message = firstIssue?.message || 'Dữ liệu đầu vào không hợp lệ';
          const details = parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }));
          throw new ValidationError(message, details);
        }
        req.body = parsed.data;
      }

      if (schemas.query) {
        const parsed = schemas.query.safeParse(req.query);
        if (!parsed.success) {
          const firstIssue = parsed.error.issues[0];
          const message = firstIssue?.message || 'Tham số truy vấn (query) không hợp lệ';
          const details = parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }));
          throw new ValidationError(message, details);
        }
        try {
          req.query = parsed.data;
        } catch {
          Object.assign(req.query, parsed.data);
        }
        req.validatedQuery = parsed.data;
      }

      if (schemas.params) {
        const parsed = schemas.params.safeParse(req.params);
        if (!parsed.success) {
          const firstIssue = parsed.error.issues[0];
          const message = firstIssue?.message || 'Tham số đường dẫn (params) không hợp lệ';
          const details = parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }));
          throw new ValidationError(message, details);
        }
        try {
          req.params = parsed.data;
        } catch {
          Object.assign(req.params, parsed.data);
        }
        req.validatedParams = parsed.data;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
