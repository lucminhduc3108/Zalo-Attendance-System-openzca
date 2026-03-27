import Attendance from '../../models/Attendance.js';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function timeString(date) {
  return date?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) ?? '—';
}

function isLate(date) {
  if (!date) return false;
  const h = date.getHours();
  const m = date.getMinutes();
  return h > 9 || (h === 9 && m > 0);
}

export const queryMissingRecords = {
  name: 'query_missing_records',
  description:
    'Tìm các bản ghi chấm công bất thường: thiếu checkout, đi muộn (sau 9:00 sáng), hoặc chưa checkin hôm nay. Dùng type để lọc loại bất thường.',
  parameters: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'Ngày cần kiểm tra (YYYY-MM-DD). Mặc định: hôm nay.',
      },
      type: {
        type: 'string',
        description:
          'Loại bất thường: "missing_checkout" | "late" | "missing_checkin" | "all". Mặc định: "all".',
        default: 'all',
      },
    },
    required: [],
  },

  async execute({ date, type = 'all' } = {}) {
    const targetDate = date || todayDate();

    const allRecords = await Attendance.find({ date: targetDate }).lean();

    // missing_checkout: have checkin but no checkout
    if (type === 'missing_checkout' || type === 'all') {
      const missingCheckout = allRecords.filter((r) => r.status === 'missing_checkout');
      if (type === 'missing_checkout') {
        if (missingCheckout.length === 0)
          return `✅ Tất cả nhân viên đã checkout ngày ${targetDate}.`;
        const lines = missingCheckout.map(
          (r) => `🟡 ${r.userName} — checkin ${timeString(r.checkin)}, chưa checkout`
        );
        return `⚠️ Nhân viên chưa checkout ngày ${targetDate}:\n${lines.join('\n')}`;
      }
    }

    // late: checkin after 9:00 AM
    const lateRecords = allRecords.filter((r) => isLate(r.checkin));
    if (type === 'late') {
      if (lateRecords.length === 0) return `✅ Không có ai đi muộn ngày ${targetDate}.`;
      const lines = lateRecords.map(
        (r) => `🔴 ${r.userName} — checkin lúc ${timeString(r.checkin)}`
      );
      return `🔴 Nhân viên đi muộn ngày ${targetDate}:\n${lines.join('\n')}`;
    }

    // missing_checkin: no checkin record at all for someone who should have checked in
    if (type === 'missing_checkin' || type === 'all') {
      // Compare with registered users from User model
      const { User } = await import('../../models/index.js');
      const allUsers = await User.find({ isActive: true, role: 'employee' }).lean();
      const checkedInIds = new Set(allRecords.map((r) => r.zaloId));
      const missingCheckin = allUsers.filter((u) => !checkedInIds.has(u.zaloId));
      if (type === 'missing_checkin') {
        if (missingCheckin.length === 0)
          return `✅ Tất cả nhân viên đã checkin ngày ${targetDate}.`;
        const lines = missingCheckin.map((u) => `🔴 ${u.zaloName}`);
        return `🔴 Nhân viên chưa checkin ngày ${targetDate}:\n${lines.join('\n')}`;
      }
    }

    // "all" type: return all categories
    const missingCheckout = allRecords.filter((r) => r.status === 'missing_checkout');

    if (missingCheckout.length === 0 && lateRecords.length === 0) {
      return `✅ Không có bất thường nào ngày ${targetDate}.`;
    }

    const lines = [];
    if (missingCheckout.length > 0) {
      lines.push(`⚠️ Chưa checkout (${missingCheckout.length}):`);
      missingCheckout.forEach((r) =>
        lines.push(`   🟡 ${r.userName} — ${timeString(r.checkin)}`)
      );
    }
    if (lateRecords.length > 0) {
      lines.push(`🔴 Đi muộn (${lateRecords.length}):`);
      lateRecords.forEach((r) =>
        lines.push(`   🔴 ${r.userName} — ${timeString(r.checkin)}`)
      );
    }

    return `⚠️ Bất thường ngày ${targetDate}:\n${lines.join('\n')}`;
  },
};
