/**
 * Tool: syncHistory
 * Wraps: openzca db sync
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const syncHistory = {
  name: 'sync_history',
  description:
    'Đồng bộ toàn bộ lịch sử tin nhắn từ Zalo vào database cục bộ. ' +
    'Dùng khi cần cập nhật database với tin nhắn mới nhất hoặc khắc phục dữ liệu bị thiếu. ' +
    'Thao tác này có thể mất thời gian với lượng tin nhắn lớn.',
  parameters: {
    type: 'object',
    properties: {
      // no required params
    },
  },

  async execute() {
    console.log('[SYNC_HISTORY] ⬆️  openzca db sync');
    const result = await runOpenzca(['db', 'sync']);
    console.log('[SYNC_HISTORY] ✅', result);
    return result;
  },
};
