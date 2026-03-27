/**
 * Tool: searchMessages
 * Wraps: openzca db group messages <groupId> [--since <duration>] [--from <ts>] [--to <ts>] [--json] [--limit N]
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const searchMessages = {
  name: 'search_messages',
  description:
    'Tìm kiếm tin nhắn trong một nhóm Zalo từ database cục bộ. ' +
    'Hỗ trợ lọc theo khoảng thời gian (since, from, to) và giới hạn số lượng. ' +
    'Dùng khi cần tra cứu lịch sử chat hoặc tìm tin nhắn cũ trong nhóm.',
  parameters: {
    type: 'object',
    properties: {
      groupId: {
        type: 'string',
        description: 'ID của nhóm cần tìm tin nhắn',
      },
      since: {
        type: 'string',
        description: 'Khoảng thời gian trước, ví dụ: 1h, 1d, 1w (1 giờ, 1 ngày, 1 tuần)',
      },
      fromTs: {
        type: 'number',
        description: 'Timestamp (epoch seconds) bắt đầu tìm kiếm',
      },
      toTs: {
        type: 'number',
        description: 'Timestamp (epoch seconds) kết thúc tìm kiếm',
      },
      limit: {
        type: 'integer',
        description: 'Số lượng tin nhắn tối đa trả về',
        default: 50,
      },
    },
    required: ['groupId'],
  },

  async execute({ groupId, since, fromTs, toTs, limit = 50 }) {
    const args = ['db', 'group', 'messages', groupId];
    if (since) args.push('--since', since);
    if (fromTs) args.push('--from', String(fromTs));
    if (toTs) args.push('--to', String(toTs));
    args.push('--json', '--limit', String(limit));
    console.log('[SEARCH_MESSAGES] ⬆️  openzca', args.join(' '));
    const result = await runOpenzca(args);
    console.log('[SEARCH_MESSAGES] ✅', result.slice(0, 300));
    return result;
  },
};
