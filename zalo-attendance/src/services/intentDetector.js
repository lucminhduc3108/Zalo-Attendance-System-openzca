/**
 * intentDetector — Regex-based intent classification.
 * Only checkin/checkout are handled locally.
 * Everything else returns 'agent' → zaloAgent takes over.
 */

const CHECKIN_PATTERN = /^(checkin|điểm danh|start|in)\b/i;
const CHECKOUT_PATTERN = /^(checkout|out|off|kết thúc)\b/i;

export function detectIntent(content) {
  if (!content || typeof content !== 'string') {
    return 'agent';
  }

  const trimmed = content.trim();

  if (CHECKIN_PATTERN.test(trimmed)) {
    return 'checkin';
  }

  if (CHECKOUT_PATTERN.test(trimmed)) {
    return 'checkout';
  }

  return 'agent';
}
