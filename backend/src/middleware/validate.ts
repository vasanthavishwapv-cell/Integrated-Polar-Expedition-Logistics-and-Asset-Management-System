import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { sendError } from '../utils/response';

export const validate =
  (schema: ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = (err as any).issues || (err as any).errors || [];
        sendError(
          res,
          'VALIDATION_ERROR',
          issues.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join('; '),
          400
        );
        return;
      }
      next(err);
    }
  };
