/**
 * Tool: renameGroup
 * Wraps: openzca group rename <groupId> <name>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const renameGroup = {
  name: 'rename_group',
  description:
    'Đổi tên một nhóm Zalo. ' +
    'Dùng khi cần cập nhật tên nhóm cho phù hợp với nội dung hoặc dự án mới.',
  parameters: {
    type: 'object',
    properties: {
      groupId: {
        type: 'string',
        description: 'ID của nhóm cần đổi tên',
      },
      name: {
        type: 'string',
        description: 'Tên mới cho nhóm',
      },
    },
    required: ['groupId', 'name'],
  },

  async execute({ groupId, name }) {
    console.log('[RENAME_GROUP] ⬆️  openzca group rename', groupId, name);
    const result = await runOpenzca(['group', 'rename', groupId, name]);
    console.log('[RENAME_GROUP] ✅', result);
    return result;
  },
};
