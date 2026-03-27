/**
 * Tool: reactMessage
 * Wraps: openzca msg react <msgId> <cliMsgId> <threadId> <reaction>
 */
import { runOpenzca } from '../../utils/openzcaRunner.js';

export const reactMessage = {
  name: 'react_message',
  description:
    'Thêm reaction (cảm xúc) vào một tin nhắn Zalo. ' +
    'Dùng khi cần biểu lộ cảm xúc với một tin nhắn cụ thể. ' +
    'Reaction ví dụ: 👍 👎 ❤️ 😂 😢 😡.',
  parameters: {
    type: 'object',
    properties: {
      msgId: {
        type: 'string',
        description: 'ID của tin nhắn cần react',
      },
      cliMsgId: {
        type: 'string',
        description: 'CLI message ID tương ứng với msgId',
      },
      threadId: {
        type: 'string',
        description: 'ID cuộc trò chuyện chứa tin nhắn',
      },
      reaction: {
        type: 'string',
        description: 'Reaction emoji, ví dụ: 👍 ❤️ 😂',
      },
    },
    required: ['msgId', 'cliMsgId', 'threadId', 'reaction'],
  },

  async execute({ msgId, cliMsgId, threadId, reaction }) {
    console.log('[REACT_MESSAGE] ⬆️  openzca msg react', msgId, cliMsgId, threadId, reaction);
    const result = await runOpenzca(['msg', 'react', msgId, cliMsgId, threadId, reaction]);
    console.log('[REACT_MESSAGE] ✅', result);
    return result;
  },
};
