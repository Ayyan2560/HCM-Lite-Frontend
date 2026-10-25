import { AppError } from '../utils/http.mjs';

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.`, code: 'NOT_FOUND' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      code: error.code || 'ERROR',
      details: error.details || null
    });
  }
  if (error?.name === 'ValidationError') {
    const details = {};
    for (const [field, issue] of Object.entries(error.errors || {})) details[field] = issue.message;
    return res.status(400).json({ success: false, message: 'Validation failed.', code: 'VALIDATION_ERROR', details });
  }
  if (error?.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid value for ${error.path}.`, code: 'BAD_REQUEST' });
  }
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'record';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
      code: 'DUPLICATE',
      details: { field }
    });
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON body.', code: 'BAD_JSON' });
  }
  // eslint-disable-next-line no-console
  console.error('[error]', req.method, req.originalUrl, error);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong on the server. Please try again.',
    code: 'INTERNAL_ERROR'
  });
}
