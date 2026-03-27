/**
 * Tool: listGroups
 * Wraps: openzca db group list --json
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const listGroups = {
  name: 'list_groups',
  description:
    'Liệt kê tất cả các nhóm Zalo mà bot đã tham gia. ' +
    'Trả về danh sách đầy đủ gồm ID, tên nhóm và số thành viên. ' +
    'Dùng khi cần xem toàn bộ nhóm hoặc tìm nhóm theo tên.',
  parameters: {
    type: 'object',
    properties: {
      // no required params — uses DB directly
    },
  },

  async execute() {
    console.log('[LIST_GROUPS] ⬆️  openzca db group list --json');
    const result = await runOpenzca(['db', 'group', 'list', '--json']);
    console.log('[LIST_GROUPS] ✅', result.slice(0, 300));
    return result;
  },
};
