import Attendance from '../../models/Attendance.js';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function timeString(date) {
  return date?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) ?? '—';
}

export const queryTodayCheckins = {
  name: 'query_today_checkins',
  description: 'Lấy danh sách tất cả nhân viên đã checkin hôm nay. Trả về tên, giờ checkin, giờ checkout (nếu có), và trạng thái.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },

  async execute() {
    const date = todayDate();
    const records = await Attendance.find({ date })
      .sort({ checkin: 1 })
      .lean();

    if (records.length === 0) {
      return 'Hôm nay chưa có ai checkin.';
    }

    const lines = records.map((r) => {
      const status = r.status === 'completed' ? '✅' : '🟡';
      const checkoutStr = r.checkout ? timeString(r.checkout) : 'chưa checkout';
      return `${status} ${r.userName} | Checkin: ${timeString(r.checkin)} | Checkout: ${checkoutStr}`;
    });

    return `📋 Danh sách checkin hôm nay (${date}):\n${lines.join('\n')}`;
  },
};
