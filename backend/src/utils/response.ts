// Standard API response envelope as per §10
export const sendSuccess = (
  res: import('express').Response,
  data: unknown,
  statusCode = 200,
  meta?: Record<string, unknown>
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
};

export const sendError = (
  res: import('express').Response,
  code: string,
  message: string,
  statusCode = 400
): void => {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};

// Paginate a mongoose query result
export const paginateMeta = (total: number, page: number, limit: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
