import { GoogleGenAI } from '@google/genai';
import config from '../config/index.js';
import { ATTENDANCE_PROMPT } from '../prompts/attendancePrompt.js';
import Attendance from '../models/Attendance.js';
import { User } from '../models/index.js';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

/**
 * Build a rich context string from MongoDB attendance data.
 * @param {string|null} date - "YYYY-MM-DD" optional date filter
 */
async function buildAttendanceContext(date = null) {
  const records = await Attendance.find(date ? { date } : {}).sort({ date: -1 }).limit(100).lean();
  const users = await User.find({ isActive: true }).lean();

  if (records.length === 0 && users.length === 0) {
    return 'Chưa có dữ liệu chấm công nào trong hệ thống.';
  }

  const header = `📅 Dữ liệu ${date ? `ngày ${date}` : 'gần đây (tối đa 100 bản ghi)'}:\n`;

  const lines = records.map((r) => {
    const ci = r.checkin
      ? new Date(r.checkin).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '—';
    const co = r.checkout
      ? new Date(r.checkout).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '—';
    const badge = r.status === 'completed' ? '✅' : '⚠️';
    return `${badge} ${r.userName} | Checkin: ${ci} | Checkout: ${co} | ${r.date}`;
  });

  const userLine =
    users.length > 0
      ? `\n👥 Nhân viên đã đăng ký (${users.length}): ${users.map((u) => u.zaloName).join(', ')}`
      : '';

  return header + lines.join('\n') + userLine;
}

/**
 * Call Google Gemini to answer a user question about attendance.
 * @param {string} question          - Raw message from user
 * @param {{ zaloId: string, zaloName: string }} sender
 * @returns {Promise<string>}          - Gemini's reply text
 */
export async function askClaude(question, sender) {
  if (!config.geminiApiKey) {
    console.warn('[CLAUDE] GEMINI_API_KEY not set');
    return '🤖 API key chưa được cấu hình. Liên hệ quản trị viên để bổ sung.';
  }

  console.log(`[CLAUDE] Query from ${sender.zaloName}: "${question}"`);

  let context;
  try {
    context = await buildAttendanceContext();
  } catch (err) {
    console.error('[CLAUDE] Failed to build attendance context:', err.message);
    return '🔧 Không thể đọc dữ liệu chấm công lúc này. Thử lại sau nhé!';
  }

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${ATTENDANCE_PROMPT}\n\nCâu hỏi từ nhân viên "${sender.zaloName}" (zaloId: ${sender.zaloId}):\n"${question}"\n\n---\nDữ liệu hiện có:\n${context}`,
    });

    const reply = result.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    console.log(`[CLAUDE] Reply: ${reply}`);
    return reply;
  } catch (err) {
    console.error('[CLAUDE] API call failed:', err.message);
    return '🔧 Đang bảo trì, thử lại sau nhé!';
  }
}
