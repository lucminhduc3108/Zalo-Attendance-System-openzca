import { GoogleGenAI } from '@google/genai';
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
    return 'API key chua duoc cau hinh. Lien he quan tri vien de bo sung.';
  }

  const role = await getUserRole(sender.zaloId);
  const toolDefs = [...TOOL_REGISTRY.values()].map(toolToGemini);
  const tools = toolDefs;

  // Conversation history: starts with user message
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

    const content = result?.candidates?.[0]?.content;

    if (!content?.parts?.length) {
      console.warn(`[ZALO_AGENT] Loop ${loop}: empty/invalid response from Gemini`);
      break;
    }

    const parts = content.parts;

    // Separate text parts from function call parts
    const textParts = parts.filter((p) => p.text);
    const fcParts = parts.filter((p) => p.functionCall);

    // ── No function call — return text ────────────────────────────────────
    if (!fcParts.length) {
      const text = textParts.map((p) => p.text).join('');
      console.log(`[ZALO_AGENT] Loop ${loop}: text response (${text.length} chars)`);
      return text || 'Da xu ly xong.';
    }

    // ── Push model response ONCE (preserves thoughtSignature) ─────────────
    conversation.push(content);

    // ── Function calls: execute each and append functionResponse ──────────
    for (const fcPart of fcParts) {
      const fc = fcPart.functionCall;
      const toolName = fc.name;
      const toolArgs = fc.args ?? {};
      const fcId = fc.id ?? `${loop}-${toolName}`;

      console.log(`[ZALO_AGENT] Loop ${loop}: calling ${toolName}(${JSON.stringify(toolArgs)})`);

      // Tool not found
      const tool = TOOL_REGISTRY.get(toolName);
      if (!tool) {
        console.warn(`[ZALO_AGENT] Loop ${loop}: tool "${toolName}" not found`);
        conversation.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: toolName,
              response: { error: `Tool "${toolName}" not found.` },
            },
          }],
        });
        continue;
      }

      // Permission denied
      if (!checkPermission(role, toolName)) {
        console.warn(`[ZALO_AGENT] Loop ${loop}: permission denied for "${toolName}" (role=${role})`);
        conversation.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: toolName,
              response: { error: 'Permission denied. Only managers can use this tool.' },
            },
          }],
        });
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

      // Append functionResponse with user role (required by Gemini API)
      conversation.push({
        role: 'user',
        parts: [{
          functionResponse: {
            id: fcId,
            name: toolName,
            response: { result: toolResult },
          },
        }],
      });
    }
  }

  return 'He thong da xu ly nhung chua hoan thanh. Vui long thu lai.';
}
