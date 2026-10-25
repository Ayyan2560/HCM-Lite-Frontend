import { Notification } from '../models/Notification.mjs';
import { User } from '../models/User.mjs';

export async function notifyUser(userId, { title, message, type = 'system', link = '' }) {
  if (!userId) return null;
  return Notification.create({ user: userId, title, message, type, link });
}

export async function notifyRole(roles, payload) {
  const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id').lean();
  if (!users.length) return [];
  return Notification.insertMany(users.map((user) => ({ user: user._id, ...payload })));
}

export async function notifyEmployee(employeeId, payload) {
  const user = await User.findOne({ employee: employeeId, isActive: true }).select('_id').lean();
  if (!user) return null;
  return notifyUser(user._id, payload);
}
