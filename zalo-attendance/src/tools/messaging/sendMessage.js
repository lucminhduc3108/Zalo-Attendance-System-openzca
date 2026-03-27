/**
 * Tool: sendMessage
 * Wraps: openzca msg send <threadId> <message> [--group]
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const sendMessage = {
  name: 'send_message',
  description:
    'Gửi tin nhắn văn bản tới một cuộc trò chuyện Zalo. ' +
    'Dùng khi người dùng muốn nhắn tin cho ai đó hoặc gửi thông báo tới nhóm. ' +
    'threadId là ID cuộc trò chuyện (user hoặc group). ' +
    'Dùng --group nếu threadId là group ID.',
  parameters: {
    type: 'object',
    properties: {
      threadId: {
        type: 'string',
        description: 'ID của cuộc trò chuyện (user hoặc group)',
      },
      message: {
        type: 'string',
        description: 'Nội dung tin nhắn cần gửi',
      },
      isGroup: {
        type: 'boolean',
        description: 'Set true nếu threadId là group ID (thêm flag --group)',
        default: false,
      },
    },
    required: ['threadId', 'message'],
  },

  async execute({ threadId, message, isGroup = false }) {
    console.log('[SEND_MESSAGE] ⬆️  openzca msg send', threadId, JSON.stringify(message), isGroup ? '--group' : '');
    const args = ['msg', 'send', threadId, message];
    if (isGroup) args.push('--group');
    const result = await runOpenzca(args);
    console.log('[SEND_MESSAGE] ✅', result);
    return result;
  },
};
