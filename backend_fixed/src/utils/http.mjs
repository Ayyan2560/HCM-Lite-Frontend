export class AppError extends Error {
  constructor(status, message, details = null, code = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
    this.code = code;
    this.expected = true;
  }
}

export const badRequest = (message, details) => new AppError(400, message, details, 'BAD_REQUEST');
export const unauthorized = (message = 'Authentication required.') => new AppError(401, message, null, 'UNAUTHORIZED');
export const forbidden = (message = 'You do not have permission to perform this action.') =>
  new AppError(403, message, null, 'FORBIDDEN');
export const notFound = (message = 'Resource not found.') => new AppError(404, message, null, 'NOT_FOUND');
export const conflict = (message, details = null) => new AppError(409, message, details, 'CONFLICT');
export const unprocessable = (message, details = null) => new AppError(422, message, details, 'UNPROCESSABLE');

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export function paginate(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
