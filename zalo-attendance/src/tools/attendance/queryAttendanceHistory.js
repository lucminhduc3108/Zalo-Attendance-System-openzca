import Attendance from '../../models/Attendance.js';

function timeString(date) {
  return date?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) ?? '—';
}

function formatDuration(checkin, checkout) {
  if (!checkin || !checkout) return '—';
  const ms = checkout - checkin;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}p`;
}

export const queryAttendanceHistory = {
  name: 'query_attendance_history',
  description:
    'Tra cứu lịch sử chấm công của một nhân viên hoặc tất cả nhân viên trong khoảng ngày. Mặc định giới hạn 20 bản ghi gần nhất.',
  parameters: {
    type: 'object',
    properties: {
      zaloId: {
        type: 'string',
        description:
          'ID Zalo của nhân viên (tùy chọn). Nếu không cung cấp, trả về tất cả nhân viên.',
      },
      userName: {
        type: 'string',
        description: 'Tên nhân viên để lọc (tùy chọn). Khớp partial.',
      },
      dateFrom: {
        type: 'string',
        description: 'Ngày bắt đầu (YYYY-MM-DD). Mặc định: 30 ngày trước.',
      },
      dateTo: {
        type: 'string',
        description: 'Ngày kết thúc (YYYY-MM-DD). Mặc định: hôm nay.',
      },
      limit: {
        type: 'integer',
        description: 'Số bản ghi tối đa trả về. Mặc định: 20.',
        default: 20,
      },
    },
    required: [],
  },

  async execute({ zaloId, userName, dateFrom, dateTo, limit = 20 }) {
    const filter = {};

    if (zaloId) filter.zaloId = zaloId;

    if (userName) {
      filter.userName = { $regex: userName, $options: 'i' };
    }

    // Default date range: last 30 days to today
    const today = new Date().toISOString().split('T')[0];
    const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const to = dateTo || today;

    filter.date = { $gte: from, $lte: to };

    const records = await Attendance.find(filter)
      .sort({ date: -1, checkin: -1 })
      .limit(limit)
      .lean();

    if (records.length === 0) {
      return `Không có bản ghi chấm công từ ${from} đến ${to}${
        userName ? ` cho "${userName}"` : ''
      }.`;
    }

    const lines = records.map((r) => {
      const duration = formatDuration(r.checkin, r.checkout);
      const status = r.status === 'completed' ? '✅' : '🟡';
      return `${status} ${r.date} | ${r.userName} | ${timeString(r.checkin)} → ${timeString(
        r.checkout
      )} | ${duration}`;
    });

    const userFilter = userName ? ` cho "${userName}"` : zaloId ? ` (${zaloId})` : '';
    return `📋 Lịch sử chấm công${userFilter} (${from} → ${to}):\n${lines.join('\n')}`;
  },
};
