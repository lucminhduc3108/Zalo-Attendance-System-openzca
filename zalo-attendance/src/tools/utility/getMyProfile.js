/**
 * Tool: getMyProfile
 * Wraps: openzca me info
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const getMyProfile = {
  name: 'get_my_profile',
  description:
    'Lấy thông tin hồ sơ của chính bot (tài khoản Zalo đang đăng nhập). ' +
    'Trả về userId, tên, avatar và các thông tin tài khoản của bot. ' +
    'Dùng khi cần xác nhận bot đang hoạt động với tài khoản nào.',
  parameters: {
    type: 'object',
    properties: {
      // no required params
    },
  },

  async execute() {
    console.log('[GET_MY_PROFILE] ⬆️  openzca me info');
    const result = await runOpenzca(['me', 'info']);
    console.log('[GET_MY_PROFILE] ✅', result);
    return result;
  },
};
