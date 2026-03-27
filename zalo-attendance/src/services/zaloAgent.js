import { GoogleGenAI, createModelContent } from '@google/genai';
import config from '../config/index.js';
import { TOOL_REGISTRY } from './toolRegistry.js';
import { checkPermission, getUserRole } from './permissionService.js';
import { toolToGemini } from '../utils/toolToGemini.js';
import { ASSISTANT_PROMPT } from '../prompts/assistantPrompt.js';

const MAX_LOOPS = Number(config.agentMaxLoops) || 5;
const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

/**
 * Run the AI agent loop for a user message.
 * @param {string} userMessage
 * @param {{ zaloId: string, zaloName: string }} sender
 * @param {string} threadId
 * @returns {Promise<string>} final text response
 */
export async function runAgent(userMessage, sender, threadId) {
  if (!config.geminiApiKey) {
    return '🤖 API key chưa được cấu hình. Liên hệ quản trị viên để bổ sung.';
  }

  const role = await getUserRole(sender.zaloId);
  const toolDefs = [...TOOL_REGISTRY.values()].map(toolToGemini);

  // Build tools config — all tools wrapped in {functionDeclarations: [...]} objects
  const tools = toolDefs;

  // Conversation history: starts with user message as ModelContent (Part array)
  const conversation = [
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  console.log(`[ZALO_AGENT] Starting loop for "${sender.zaloName}" (role=${role}), tools count=${TOOL_REGISTRY.size}`);

  for (let loop = 0; loop < MAX_LOOPS; loop++) {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: conversation,
      config: {
        systemInstruction: ASSISTANT_PROMPT,
        tools,
      },
    });

    if (!result?.candidates?.[0]?.content?.parts?.length) {
      console.warn(`[ZALO_AGENT] Loop ${loop}: empty/invalid response from Gemini`);
      break;
    }

    const parts = result.candidates[0].content.parts;

    // Separate text parts from function call parts
    const textParts = parts.filter((p) => p.text);
    const fcParts = parts.filter((p) => p.functionCall);

    // ── No function call — return text ────────────────────────────────────
    if (!fcParts.length) {
      const text = textParts.map((p) => p.text).join('');
      console.log(`[ZALO_AGENT] Loop ${loop}: text response (${text.length} chars)`);
      return text || 'Đã xử lý xong.';
    }

    // ── Function calls ─────────────────────────────────────────────────────
    for (const fcPart of fcParts) {
      const fc = fcPart.functionCall;
      const toolName = fc.name;
      const toolArgs = fc.args ?? {};
      const fcId = fc.id ?? `${loop}-${toolName}`;

      console.log(`[ZALO_AGENT] Loop ${loop}: calling ${toolName}(${JSON.stringify(toolArgs)})`);

      // Check tool exists
      const tool = TOOL_REGISTRY.get(toolName);
      if (!tool) {
        console.warn(`[ZALO_AGENT] Loop ${loop}: tool "${toolName}" not found`);
        conversation.push(createModelContent([fcPart]));
        conversation.push(
          createModelContent([{
            functionResponse: {
              name: toolName,
              response: { error: `Tool "${toolName}" not found.` },
            },
          }])
        );
        continue;
      }

      // Check permission
      if (!checkPermission(role, toolName)) {
        console.warn(`[ZALO_AGENT] Loop ${loop}: permission denied for "${toolName}" (role=${role})`);
        conversation.push(createModelContent([fcPart]));
        conversation.push(
          createModelContent([{
            functionResponse: {
              name: toolName,
              response: { error: 'Permission denied. Only managers can use this tool.' },
            },
          }])
        );
        continue;
      }

      // Execute tool
      let toolResult;
      try {
        toolResult = await tool.execute(toolArgs);
      } catch (err) {
        toolResult = `ERROR: ${err.message}`;
      }

      console.log(`[ZALO_AGENT] Loop ${loop}: ${toolName} → ${String(toolResult).substring(0, 100)}`);

      // Append function call + result as proper Part objects (no role wrapper)
      conversation.push(createModelContent([fcPart]));
      conversation.push(
        createModelContent([{
          functionResponse: {
            id: fcId,
            name: toolName,
            response: { result: toolResult },
          },
        }])
      );
    }
  }

  return '⏳ Hệ thống đã xử lý nhưng chưa hoàn thành. Vui lòng thử lại.';
}
