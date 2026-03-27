/**
 * Tool: leaveGroup
 * Wraps: openzca group leave <groupId>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const leaveGroup = {
  name: 'leave_group',
  description:
    'Rời khỏi một nhóm Zalo. ' +
    'Bot sẽ không còn nhận tin nhắn từ nhóm này nữa. ' +
    'Thường chỉ quản lý mới dùng được thao tác này.',
  parameters: {
    type: 'object',
    properties: {
      groupId: {
        type: 'string',
        description: 'ID của nhóm cần rời khỏi',
      },
    },
    required: ['groupId'],
  },

  async execute({ groupId }) {
    console.log('[LEAVE_GROUP] ⬆️  openzca group leave', groupId);
    const result = await runOpenzca(['group', 'leave', groupId]);
    console.log('[LEAVE_GROUP] ✅', result);
    return result;
  },
};
