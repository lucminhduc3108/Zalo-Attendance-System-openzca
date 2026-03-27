/**
 * Tool: getUserProfile
 * Wraps: openzca msg member-info <userId>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const getUserProfile = {
  name: 'get_user_profile',
  description:
    'Lấy thông tin hồ sơ chi tiết của một người dùng Zalo. ' +
    'Trả về tên, avatar, số điện thoại và các thông tin khác của người dùng. ' +
    'Dùng khi cần xem chi tiết hồ sơ của một nhân viên cụ thể.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'User ID của người dùng Zalo cần lấy thông tin',
      },
    },
    required: ['userId'],
  },

  async execute({ userId }) {
    console.log('[GET_USER_PROFILE] ⬆️  openzca msg member-info', userId);
    const result = await runOpenzca(['msg', 'member-info', userId]);
    console.log('[GET_USER_PROFILE] ✅', result);
    return result;
  },
};
