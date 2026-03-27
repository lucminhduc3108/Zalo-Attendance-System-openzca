/**
 * Tool: groupInfo
 * Wraps: openzca group info <groupId>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const groupInfo = {
  name: 'group_info',
  description:
    'Lấy thông tin chi tiết của một nhóm Zalo. ' +
    'Trả về tên nhóm, ID, số thành viên và các thông tin khác. ' +
    'Dùng khi cần xem thông tin tổng quan của một nhóm cụ thể.',
  parameters: {
    type: 'object',
    properties: {
      groupId: {
        type: 'string',
        description: 'ID của nhóm cần lấy thông tin',
      },
    },
    required: ['groupId'],
  },

  async execute({ groupId }) {
    console.log('[GROUP_INFO] ⬆️  openzca group info', groupId);
    const result = await runOpenzca(['group', 'info', groupId]);
    console.log('[GROUP_INFO] ✅', result);
    return result;
  },
};
