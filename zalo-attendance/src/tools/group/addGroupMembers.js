/**
 * Tool: addGroupMembers
 * Wraps: openzca group add <groupId> <userIds...>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const addGroupMembers = {
  name: 'add_group_members',
  description:
    'Thêm một hoặc nhiều thành viên vào một nhóm Zalo. ' +
    'Dùng khi cần mời thêm người vào nhóm đã có. ' +
    'groupId là ID nhóm, userIds là danh sách userId cần thêm.',
  parameters: {
    type: 'object',
    properties: {
      groupId: {
        type: 'string',
        description: 'ID của nhóm cần thêm thành viên',
      },
      userIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Danh sách userId của thành viên cần thêm',
      },
    },
    required: ['groupId', 'userIds'],
  },

  async execute({ groupId, userIds }) {
    console.log('[ADD_GROUP_MEMBERS] ⬆️  openzca group add', groupId, userIds.join(' '));
    const result = await runOpenzca(['group', 'add', groupId, ...userIds]);
    console.log('[ADD_GROUP_MEMBERS] ✅', result);
    return result;
  },
};
