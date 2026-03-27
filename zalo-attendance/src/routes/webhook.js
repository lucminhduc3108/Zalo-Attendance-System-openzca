import express from 'express';
import mongoose from 'mongoose';
import { detectIntent } from '../services/intentDetector.js';
import { checkin, checkout } from '../services/attendanceService.js';
import { sendMessage } from '../services/zaloSender.js';
import { runAgent } from '../services/zaloAgent.js';
import { User } from '../models/index.js';

export const webhookRouter = express.Router();

// In-memory set to skip duplicate msgId
const processedIds = new Set();
const MAX_PROCESSED = 10_000;

/**
 * Ensure user exists in DB (auto-register with zaloName if new).
 * @returns {Promise<import('../models/User.js').default>}
 */
async function ensureUser(zaloId, zaloName) {
  let user = await User.findOne({ zaloId });
  if (!user) {
    user = await User.create({ zaloId, zaloName });
    console.log(`[WEBHOOK] Auto-registered user: ${zaloName} (${zaloId})`);
  }
  return user;
}

/**
 * Send a reply, swallowing errors so the caller always gets a clean result.
 */
async function safeSend(threadId, message, isGroup = false) {
  try {
    await sendMessage(threadId, message, { isGroup });
  } catch (err) {
    console.error(`[WEBHOOK] safeSend failed (${threadId}):`, err.message);
  }
}

async function processPayload(payload) {
  const { msgId, content: rawContent, senderId, senderName, threadId, chatType } = payload;

  // ── 1. Validate required fields ────────────────────────────────────────
  if (!msgId || !senderId || !rawContent) {
    console.warn('[WEBHOOK] Skipping: missing required fields', { msgId, senderId, content: rawContent });
    return { handled: false, reason: 'missing_fields' };
  }

  const content = rawContent.trim();
  if (!content) {
    console.log(`[WEBHOOK] Skipping: content is only whitespace`);
    return { handled: false, reason: 'empty_content' };
  }

  // ── 2. Skip duplicate msgId ────────────────────────────────────────────
  if (processedIds.has(msgId)) {
    console.log(`[WEBHOOK] Skipping duplicate msgId: ${msgId}`);
    return { handled: false, reason: 'duplicate' };
  }
  processedIds.add(msgId);
  if (processedIds.size > MAX_PROCESSED) {
    const toDelete = Array.from(processedIds).slice(0, MAX_PROCESSED / 2);
    toDelete.forEach((id) => processedIds.delete(id));
  }

  const intent = detectIntent(content);
  const isGroup = chatType === 'group';
  const sender = { zaloId: senderId, zaloName: senderName };

  console.log(`[WEBHOOK] Intent=${intent} | From=${senderName} | Content="${content}"`);

  // ── 3. Auto-register user ──────────────────────────────────────────────
  try {
    await ensureUser(senderId, senderName);
  } catch (err) {
    console.warn('[WEBHOOK] Failed to ensure user:', err.message);
    // Non-fatal — continue even if registration fails
  }

  // ── 4. Known intents: checkin / checkout ───────────────────────────────
  if (intent === 'checkin') {
    const result = await checkin(sender, content);
    await safeSend(threadId, result.message, isGroup);
    return { handled: true, intent };
  }

  if (intent === 'checkout') {
    const result = await checkout(sender, content);
    await safeSend(threadId, result.message, isGroup);
    return { handled: true, intent };
  }

  // ── 5. Agent intent: delegate to AI agent ─────────────────────────────
  try {
    const reply = await runAgent(content, sender, threadId);
    await safeSend(threadId, reply, isGroup);
    return { handled: true, intent: 'agent' };
  } catch (err) {
    console.error('[WEBHOOK] Agent delegation error:', err.message);
    await safeSend(threadId, '🔧 Đang bảo trì, thử lại sau nhé!', isGroup);
    return { handled: false, reason: 'agent_error' };
  }
}

webhookRouter.post('/', async (req, res) => {
  try {
    const result = await processPayload(req.body);
    res.json(result);
  } catch (err) {
    console.error('[WEBHOOK] Unexpected error:', err.message);

    // MongoDB / network error
    if (err instanceof mongoose.Error || err.name === 'MongoNetworkError') {
      const { threadId, chatType } = req.body || {};
      const isGroup = chatType === 'group';
      await safeSend(threadId, '🔧 Hệ thống tạm bảo trì, thử lại sau nhé!', isGroup);
      return res.status(503).json({ error: 'service_unavailable' });
    }

    res.status(500).json({ error: 'internal_error' });
  }
});
