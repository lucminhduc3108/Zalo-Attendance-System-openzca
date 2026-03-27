import { User } from '../models/index.js';
import Attendance from '../models/Attendance.js';

/**
 * Auto-register a user from webhook payload.
 */
async function ensureUser({ zaloId, zaloName }) {
  let user = await User.findOne({ zaloId });
  if (!user) {
    user = await User.create({ zaloId, zaloName });
    console.log(`[ATTENDANCE] New user registered: ${zaloName} (${zaloId})`);
  }
  return user;
}

/**
 * Extract optional note from message content after the intent keyword.
 * e.g. "checkin làm ở nhà" → note = "làm ở nhà"
 */
function extractNote(content, intent) {
  const regex = new RegExp(`^${intent}\\s+(.+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function todayDate() {
  return new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function timeString(date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Handle checkin intent.
 * @param {{ zaloId: string, zaloName: string }} sender
 * @param {string} content
 * @returns {{ success: boolean, message: string }}
 */
export async function checkin(sender, content) {
  try {
    const user = await ensureUser(sender);
    const date = todayDate();
    const note = extractNote(content, 'checkin');

    // Check double checkin
    const existing = await Attendance.findOne({ zaloId: sender.zaloId, date });
    if (existing) {
      return {
        success: false,
        message: `⚠️ ${user.zaloName} đã checkin lúc ${timeString(existing.checkin)} rồi!`,
      };
    }

    const record = await Attendance.create({
      zaloId: sender.zaloId,
      userName: user.zaloName,
      date,
      checkin: new Date(),
      checkinNote: note,
      status: 'missing_checkout',
    });

    console.log(`[ATTENDANCE] Checkin: ${user.zaloName} at ${timeString(record.checkin)}`);

    const emoji = new Date().getHours() < 9 ? '🌅' : '👋';
    return {
      success: true,
      message: `${emoji} Checkin thành công!\n👤 ${user.zaloName}\n🕐 ${timeString(record.checkin)}\n📅 ${date}${note ? `\n📝 Ghi chú: ${note}` : ''}`,
    };
  } catch (err) {
    console.error('[ATTENDANCE] checkin error:', err.message);
    throw err;
  }
}

/**
 * Handle checkout intent.
 * @param {{ zaloId: string, zaloName: string }} sender
 * @param {string} content
 * @returns {{ success: boolean, message: string }}
 */
export async function checkout(sender, content) {
  try {
    const user = await ensureUser(sender);
    const date = todayDate();
    const note = extractNote(content, 'checkout');

    const record = await Attendance.findOne({ zaloId: sender.zaloId, date });

    if (!record) {
      return {
        success: false,
        message: `⚠️ ${user.zaloName} chưa checkin hôm nay! Vui lòng checkin trước.`,
      };
    }

    if (record.checkout) {
      return {
        success: false,
        message: `⚠️ ${user.zaloName} đã checkout lúc ${timeString(record.checkout)} rồi!`,
      };
    }

    record.checkout = new Date();
    record.checkoutNote = note;
    record.status = 'completed';
    await record.save();

    const durationMs = record.checkout - record.checkin;
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);

    console.log(`[ATTENDANCE] Checkout: ${user.zaloName} at ${timeString(record.checkout)}`);

    return {
      success: true,
      message: `✅ Checkout thành công!\n👤 ${user.zaloName}\n🕐 ${timeString(record.checkout)}\n⏱️ Tổng thời gian: ${hours}h ${minutes}p${note ? `\n📝 Ghi chú: ${note}` : ''}`,
    };
  } catch (err) {
    console.error('[ATTENDANCE] checkout error:', err.message);
    throw err;
  }
}
