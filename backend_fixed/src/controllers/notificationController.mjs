import { Notification } from '../models/Notification.mjs';
import { notFound, ok } from '../utils/http.mjs';

export async function myNotifications(req, res) {
  const limit = Math.min(100, Number(req.query.limit) || 30);
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ user: req.user._id, read: false })
  ]);
  ok(res, {
    unread,
    items: items.map((notification) => ({
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      link: notification.link,
      read: notification.read,
      createdAt: notification.createdAt
    }))
  });
}

export async function markRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) throw notFound('Notification not found.');
  ok(res, { id: notification._id.toString(), read: true });
}

export async function markAllRead(req, res) {
  const result = await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  ok(res, { updated: result.modifiedCount || 0 });
}
