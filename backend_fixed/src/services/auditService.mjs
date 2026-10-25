import { AuditLog } from '../models/AuditLog.mjs';

const SENSITIVE_KEYS = [
  'password', 'passwordhash', 'token', 'jwt', 'secret', 'apikey', 'ai_api_key', 'authorization'
];

function sanitize(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toISOString();
    if (value._bsontype === 'ObjectId') return value.toString();
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase().replace(/[^a-z_]/g, ''))) {
        output[key] = '[redacted]';
      } else {
        output[key] = sanitize(item, depth + 1);
      }
    }
    return output;
  }
  if (typeof value === 'string' && value.length > 2000) return `${value.slice(0, 2000)}…`;
  return value;
}

export async function recordAudit({ req, actor, action, entityType, entityId = null, summary = '', before = null, after = null }) {
  try {
    await AuditLog.create({
      actor: actor?._id || null,
      actorName: actor?.name || 'system',
      actorRole: actor?.role || 'system',
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      summary,
      before: sanitize(before),
      after: sanitize(after),
      ip: req?.ip || ''
    });
  } catch (error) {
    // Auditing must never break the business transaction it observes.
    // eslint-disable-next-line no-console
    console.error('[audit] failed to persist entry', error.message);
  }
}

export { sanitize };
