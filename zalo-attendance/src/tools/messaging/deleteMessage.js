/**
 * Tool: deleteMessage
 * Wraps: openzca msg delete <msgId> <cliMsgId> <uidFrom> <threadId>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const deleteMessage = {
  name: 'delete_message',
  description:
    'Xóa một tin nhắn trong cuộc trò chuyện Zalo. ' +
    'Chỉ xóa được tin nhắn do bot đã gửi. ' +
    'Cần cung cấp msgId, cliMsgId, uidFrom và threadId của tin nhắn cần xóa.',
  parameters: {
    type: 'object',
    properties: {
      msgId: {
        type: 'string',
        description: 'ID của tin nhắn cần xóa',
      },
      cliMsgId: {
        type: 'string',
        description: 'CLI message ID tương ứng với msgId',
      },
      uidFrom: {
        type: 'string',
        description: 'User ID của người gửi tin nhắn',
      },
      threadId: {
        type: 'string',
        description: 'ID cuộc trò chuyện chứa tin nhắn',
      },
    },
    required: ['msgId', 'cliMsgId', 'uidFrom', 'threadId'],
  },

  async execute({ msgId, cliMsgId, uidFrom, threadId }) {
    console.log('[DELETE_MESSAGE] ⬆️  openzca msg delete', msgId, cliMsgId, uidFrom, threadId);
    const result = await runOpenzca(['msg', 'delete', msgId, cliMsgId, uidFrom, threadId]);
    console.log('[DELETE_MESSAGE] ✅', result);
    return result;
  },
};
