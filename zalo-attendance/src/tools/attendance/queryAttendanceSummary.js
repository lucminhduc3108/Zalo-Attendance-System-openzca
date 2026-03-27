import Attendance from '../../models/Attendance.js';

function formatDuration(ms) {
  if (!ms) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}p`;
}

export const queryAttendanceSummary = {
  name: 'query_attendance_summary',
  description:
    'Tổng hợp thống kê chấm công: số ngày làm việc, tổng giờ làm, số ngày complete vs missing checkout, trung bình giờ làm mỗi ngày.',
  parameters: {
    type: 'object',
    properties: {
      zaloId: {
        type: 'string',
        description:
          'ID Zalo nhân viên cụ thể (tùy chọn). Nếu không có, thống kê cho tất cả.',
      },
      userName: {
        type: 'string',
        description: 'Tên nhân viên để lọc (tùy chọn).',
      },
      dateFrom: {
        type: 'string',
        description: 'Ngày bắt đầu (YYYY-MM-DD). Mặc định: đầu tháng hiện tại.',
      },
      dateTo: {
        type: 'string',
        description: 'Ngày kết thúc (YYYY-MM-DD). Mặc định: hôm nay.',
      },
    },
    required: [],
  },

  async execute({ zaloId, userName, dateFrom, dateTo }) {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .split('T')[0];

    const from = dateFrom || firstOfMonth;
    const to = dateTo || today;

    const match = { date: { $gte: from, $lte: to } };
    if (zaloId) match.zaloId = zaloId;
    if (userName) match.userName = { $regex: userName, $options: 'i' };

    const records = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$zaloId',
          userName: { $first: '$userName' },
          totalDays: { $sum: 1 },
          completedDays: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          missingCheckout: {
            $sum: { $cond: [{ $eq: ['$status', 'missing_checkout'] }, 1, 0] },
          },
          totalMs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$checkin', null] },
                    { $ne: ['$checkout', null] },
                  ],
                },
                { $subtract: ['$checkout', '$checkin'] },
                0,
              ],
            },
          },
        },
      },
      { $sort: { totalDays: -1 } },
    ]);

    if (records.length === 0) {
      return `Không có dữ liệu chấm công từ ${from} đến ${to}.`;
    }

    const lines = records.map((r) => {
      const avgMs =
        r.completedDays > 0 ? Math.round(r.totalMs / r.completedDays) : 0;
      return (
        `👤 ${r.userName}\n` +
        `   📅 ${r.totalDays} ngày làm | ✅ ${r.completedDays} hoàn thành | 🟡 ${r.missingCheckout} thiếu checkout\n` +
        `   ⏱️ Tổng giờ: ${formatDuration(r.totalMs)} | 📊 TB/ngày: ${formatDuration(avgMs)}`
      );
    });

    return `📊 Thống kê chấm công (${from} → ${to}):\n${lines.join('\n\n')}`;
  },
};
