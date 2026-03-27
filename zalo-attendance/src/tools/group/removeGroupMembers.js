/**
 * Tool: removeGroupMembers
 * Wraps: openzca group remove <groupId> <userIds...>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const removeGroupMembers = {
  name: 'remove_group_members',
  description:
    'Xóa một hoặc nhiều thành viên khỏi một nhóm Zalo. ' +
    'Dùng khi cần loại bỏ thành viên không còn trong nhóm. ' +
    'groupId là ID nhóm, userIds là danh sách userId cần xóa.',
  parameters: {
    type: 'object',
    properties: {
      groupId: {
        type: 'string',
        description: 'ID của nhóm cần xóa thành viên',
      },
      userIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Danh sách userId của thành viên cần xóa',
      },
    },
    required: ['groupId', 'userIds'],
  },

  async execute({ groupId, userIds }) {
    console.log('[REMOVE_GROUP_MEMBERS] ⬆️  openzca group remove', groupId, userIds.join(' '));
    const result = await runOpenzca(['group', 'remove', groupId, ...userIds]);
    console.log('[REMOVE_GROUP_MEMBERS] ✅', result);
    return result;
  },
};
