import mongoose from 'mongoose';

/**
 * Append-only audit trail. No update/delete routes exist for this collection.
 * Snapshots are sanitized before persisting (see services/auditService.mjs).
 */
const auditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, default: 'system' },
    actorRole: { type: String, default: 'system' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, default: null },
    summary: { type: String, default: '' },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditSchema);
export default AuditLog;
