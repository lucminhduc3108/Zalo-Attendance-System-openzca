/**
 * Tool: createGroupChat
 * Wraps: openzca group create <name> <members...>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const createGroupChat = {
  name: 'create_group_chat',
  description:
    'Tạo một nhóm chat Zalo mới với tên và danh sách thành viên. ' +
    'Dùng khi cần tạo nhóm làm việc, nhóm dự án, hoặc nhóm thông báo. ' +
    'members là danh sách userId cách nhau bằng dấu cách.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Tên nhóm chat cần tạo',
      },
      members: {
        type: 'array',
        items: { type: 'string' },
        description: 'Danh sách userId của các thành viên ban đầu',
      },
    },
    required: ['name', 'members'],
  },

  async execute({ name, members }) {
    if (!Array.isArray(members)) {
      throw new Error('members must be an array of userId strings');
    }
    console.log('[CREATE_GROUP_CHAT] ⬆️  openzca group create', name, members.join(' '));
    const result = await runOpenzca(['group', 'create', name, ...members]);
    console.log('[CREATE_GROUP_CHAT] ✅', result);
    return result;
  },
};
