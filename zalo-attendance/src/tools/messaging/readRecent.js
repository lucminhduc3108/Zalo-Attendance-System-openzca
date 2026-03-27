/**
 * Tool: readRecent
 * Wraps: openzca msg recent <threadId> [--json] [--source live|db|auto]
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const readRecent = {
  name: 'read_recent',
  description:
    'Đọc các tin nhắn gần đây trong một cuộc trò chuyện Zalo. ' +
    'Dùng khi cần xem lại nội dung chat gần đây hoặc tìm kiếm thông tin trong lịch sử. ' +
    'source: live = hiện tại, db = database cục bộ, auto = tự động chọn.',
  parameters: {
    type: 'object',
    properties: {
      threadId: {
        type: 'string',
        description: 'ID cuộc trò chuyện cần đọc tin nhắn',
      },
      source: {
        type: 'string',
        enum: ['live', 'db', 'auto'],
        description: 'Nguồn dữ liệu: live (hiện tại), db (database), auto (tự động)',
        default: 'auto',
      },
      json: {
        type: 'boolean',
        description: 'Trả về JSON thay vì text thuần',
        default: true,
      },
    },
    required: ['threadId'],
  },

  async execute({ threadId, source = 'auto', json = true }) {
    console.log('[READ_RECENT] ⬆️  openzca msg recent', threadId, `--source ${source}`, json ? '--json' : '');
    const args = ['msg', 'recent', threadId];
    if (source !== 'auto') args.push('--source', source);
    if (json) args.push('--json');
    const result = await runOpenzca(args);
    console.log('[READ_RECENT] ✅', result.slice(0, 200));
    return result;
  },
};
