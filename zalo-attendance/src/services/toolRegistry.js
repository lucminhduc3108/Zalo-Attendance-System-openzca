import { ZALO_TOOLS } from '../tools/index.js';

export const TOOL_REGISTRY = new Map(
  ZALO_TOOLS.map((tool) => [tool.name, tool])
);

export function getTool(name) {
  return TOOL_REGISTRY.get(name) ?? null;
}
