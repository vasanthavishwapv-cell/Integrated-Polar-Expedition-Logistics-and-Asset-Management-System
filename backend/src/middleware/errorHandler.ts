import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const issues = (err as any).issues || (err as any).errors || [];
    sendError(
      res,
      'VALIDATION_ERROR',
      issues.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', '),
      400
    );
    return;
  }

  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');

  if (res.headersSent) return;

  sendError(res, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.url} not found`, 404);
};
