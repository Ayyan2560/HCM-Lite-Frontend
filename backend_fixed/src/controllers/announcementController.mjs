import { Announcement } from '../models/Announcement.mjs';
import { AppError, notFound, ok } from '../utils/http.mjs';
import { requireEnum, requireString } from '../utils/validate.mjs';
import { recordAudit } from '../services/auditService.mjs';
import { notifyRole } from '../services/notificationService.mjs';

export async function listAnnouncements(req, res) {
  const announcements = await Announcement.find().sort({ pinned: -1, createdAt: -1 }).limit(50).lean();
  ok(res, announcements.map((announcement) => ({
    id: announcement._id.toString(),
    title: announcement.title,
    body: announcement.body,
    category: announcement.category,
    pinned: announcement.pinned,
    authorName: announcement.authorName,
    authorRole: announcement.authorRole,
    createdAt: announcement.createdAt
  })));
}

export async function createAnnouncement(req, res) {
  const title = requireString(req.body?.title, 'Title', { min: 3, max: 160 });
  const body = requireString(req.body?.body, 'Message', { min: 5, max: 3000 });
  const category = requireEnum(req.body?.category || 'general', ['general', 'policy', 'payroll', 'event'], 'Category');
  const pinned = Boolean(req.body?.pinned);

  const announcement = await Announcement.create({
    title,
    body,
    category,
    pinned,
    author: req.user._id,
    authorName: req.user.name,
    authorRole: req.user.role
  });

  await notifyRole(['hr', 'employee'], {
    title: 'New announcement',
    message: title,
    type: 'announcement',
    link: '/announcements'
  });

  await recordAudit({
    req, actor: req.user, action: 'announcement.created', entityType: 'Announcement', entityId: announcement._id,
    summary: `Announcement published: ${title}`, after: { title, category, pinned }
  });
  ok(res, {
    id: announcement._id.toString(),
    title,
    body,
    category,
    pinned,
    authorName: announcement.authorName,
    createdAt: announcement.createdAt
  }, 201);
}

export async function deleteAnnouncement(req, res) {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw notFound('Announcement not found.');
  if (req.user.role !== 'admin' && String(announcement.author) !== String(req.user._id)) {
    throw new AppError(403, 'You can only delete announcements you published.');
  }
  await Announcement.findByIdAndDelete(announcement._id);
  await recordAudit({
    req, actor: req.user, action: 'announcement.deleted', entityType: 'Announcement', entityId: announcement._id,
    summary: `Announcement deleted: ${announcement.title}`, before: { title: announcement.title, body: announcement.body }
  });
  ok(res, { id: announcement._id.toString() });
}
