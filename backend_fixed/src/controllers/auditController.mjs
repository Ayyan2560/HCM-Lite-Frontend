import { AuditLog } from '../models/AuditLog.mjs';
import { ok, paginate } from '../utils/http.mjs';

export async function listAuditLogs(req, res) {
  const { page, limit, skip } = paginate({ ...req.query, limit: req.query.limit || 30 });
  const filter = {};
  if (req.query.action) filter.action = new RegExp(String(req.query.action), 'i');
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.actor) filter.actor = req.query.actor;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) {
      const to = new Date(req.query.to);
      to.setUTCHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter)
  ]);
  ok(res, {
    items: items.map((log) => ({
      id: log._id.toString(),
      actorName: log.actorName,
      actorRole: log.actorRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      summary: log.summary,
      before: log.before,
      after: log.after,
      ip: log.ip,
      createdAt: log.createdAt
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}
