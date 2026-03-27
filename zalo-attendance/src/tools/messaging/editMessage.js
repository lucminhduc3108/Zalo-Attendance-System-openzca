/**
 * Tool: editMessage
 * Wraps: openzca msg edit <msgId> <cliMsgId> <threadId> <message>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const editMessage = {
  name: 'edit_message',
  description:
    'Chỉnh sửa nội dung một tin nhắn đã gửi trong Zalo. ' +
    'Chỉ sửa được tin nhắn do bot đã gửi. ' +
    'Cần cung cấp msgId, cliMsgId, threadId và nội dung mới.',
  parameters: {
    type: 'object',
    properties: {
      msgId: {
        type: 'string',
        description: 'ID của tin nhắn cần chỉnh sửa',
      },
      cliMsgId: {
        type: 'string',
        description: 'CLI message ID tương ứng với msgId',
      },
      threadId: {
        type: 'string',
        description: 'ID cuộc trò chuyện chứa tin nhắn',
      },
      message: {
        type: 'string',
        description: 'Nội dung mới để thay thế tin nhắn',
      },
    },
    required: ['msgId', 'cliMsgId', 'threadId', 'message'],
  },

  async execute({ msgId, cliMsgId, threadId, message }) {
    console.log('[EDIT_MESSAGE] ⬆️  openzca msg edit', msgId, cliMsgId, threadId, JSON.stringify(message));
    const result = await runOpenzca(['msg', 'edit', msgId, cliMsgId, threadId, message]);
    console.log('[EDIT_MESSAGE] ✅', result);
    return result;
  },
};
