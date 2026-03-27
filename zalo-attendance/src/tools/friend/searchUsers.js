/**
 * Tool: searchUsers
 * Wraps: openzca friend find <query>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const searchUsers = {
  name: 'search_users',
  description:
    'Tìm kiếm người dùng Zalo theo số điện thoại, username hoặc tên. ' +
    'Trả về danh sách người dùng phù hợp với query tìm kiếm. ' +
    'Dùng khi cần tra cứu thông tin nhân viên hoặc tìm người dùng Zalo.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Từ khóa tìm kiếm: số điện thoại, username hoặc tên người dùng',
      },
    },
    required: ['query'],
  },

  async execute({ query }) {
    console.log('[SEARCH_USERS] ⬆️  openzca friend find', query);
    const result = await runOpenzca(['friend', 'find', query]);
    console.log('[SEARCH_USERS] ✅', result.slice(0, 300));
    return result;
  },
};
