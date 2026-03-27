/**
 * Tool: listMembers
 * Wraps: openzca group members <groupId>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const listMembers = {
  name: 'list_members',
  description:
    'Liệt kê tất cả thành viên trong một nhóm Zalo. ' +
    'Trả về danh sách thành viên gồm userId, tên và các thông tin liên quan. ' +
    'Dùng khi cần xem ai đang trong nhóm hoặc kiểm tra thành viên.',
  parameters: {
    type: 'object',
    properties: {
      groupId: {
        type: 'string',
        description: 'ID của nhóm cần liệt kê thành viên',
      },
    },
    required: ['groupId'],
  },

  async execute({ groupId }) {
    console.log('[LIST_MEMBERS] ⬆️  openzca group members', groupId);
    const result = await runOpenzca(['group', 'members', groupId]);
    console.log('[LIST_MEMBERS] ✅', result.slice(0, 300));
    return result;
  },
};
