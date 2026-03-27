/**
 * Tool: forwardMessage
 * Wraps: openzca msg forward <message> <targets...>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const forwardMessage = {
  name: 'forward_message',
  description:
    'Chuyển tiếp một tin nhắn tới một hoặc nhiều cuộc trò chuyện Zalo. ' +
    'Dùng khi cần gửi cùng một nội dung tới nhiều người hoặc nhóm. ' +
    'targets là danh sách threadId (cách nhau bằng dấu cách).',
  parameters: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Nội dung tin nhắn cần chuyển tiếp',
      },
      targets: {
        type: 'array',
        items: { type: 'string' },
        description: 'Danh sách threadId đích để chuyển tiếp tin nhắn',
      },
    },
    required: ['message', 'targets'],
  },

  async execute({ message, targets }) {
    const targetStr = targets.join(' ');
    console.log('[FORWARD_MESSAGE] ⬆️  openzca msg forward', JSON.stringify(message), targetStr);
    const result = await runOpenzca(['msg', 'forward', message, ...targets]);
    console.log('[FORWARD_MESSAGE] ✅', result);
    return result;
  },
};
