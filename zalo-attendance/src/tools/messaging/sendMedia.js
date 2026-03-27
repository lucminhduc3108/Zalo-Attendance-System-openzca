import { runOpenzca } from '../../utils/openzcaRunner.js';

export const sendMedia = {
  name: 'send_media',
  description: 'Gửi file hình ảnh, video, hoặc voice đến người dùng hoặc nhóm Zalo. Dùng khi user muốn gửi ảnh, video, voice message.',
  parameters: {
    type: 'object',
    properties: {
      threadId: { type: 'string', description: 'Zalo ID của người nhận hoặc group ID' },
      filePath: { type: 'string', description: 'Đường dẫn file cục bộ hoặc URL của file cần gửi. Hỗ trợ: PNG, JPG, MP4, AAC, MP3, WAV, OGG.' },
      mediaType: { type: 'string', description: 'Loại media: "image", "video", "voice". Nếu không chỉ định, hệ thống tự nhận diện từ filePath.', enum: ['image', 'video', 'voice'] },
      isGroup: { type: 'boolean', description: 'true nếu gửi đến nhóm', default: false },
    },
    required: ['threadId', 'filePath'],
  },
  async execute({ threadId, filePath, mediaType, isGroup = false }) {
    console.log(`[SEND_MEDIA] ⬆️  openzca ${cmd.join(' ')}`);
    let cmd;
    if (mediaType === 'video') {
      cmd = ['msg', 'video', threadId, filePath];
    } else if (mediaType === 'voice') {
      cmd = ['msg', 'voice', threadId, filePath];
    } else {
      cmd = ['msg', 'image', threadId, filePath];
    }
    if (isGroup) cmd.push('--group');
    return await runOpenzca(cmd);
  },
};
