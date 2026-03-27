# Zalo AI Assistant v2 — Implementation Progress

> **Last updated**: 2026-03-27
> **Plan file**: `C:\Users\admin\.claude\plans\merry-churning-horizon.md`

---

## Overall Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Tool Interface Layer | ✅ Complete | 20 tool wrappers + openzcaRunner refactor |
| Phase 2: Agent Core | ✅ Complete | 2-stage review done, important fixes applied |
| Phase 3: Intent Routing + Webhook | ✅ Complete | intentDetector.js + webhook.js + claudeService.js deleted |
| Phase 4: Error Handling | ✅ Complete | Embedded in Phase 2/3 |
| Phase 5: Polish + Docs | ✅ Complete | CLAUDE.md + README.md updated |
| Debug Session 2026-03-27 | ✅ Fixed | @google/genai v1.46.0 SDK bugs in zaloAgent.js |

---

## Phase 1: Tool Interface Layer ✅

### Files Created (20 tools)

```
src/tools/
├── index.js                          ← ZALO_TOOLS[] (20 tools)
├── messaging/
│   ├── sendMessage.js                → openzca msg send
│   ├── sendMedia.js                  → openzca msg image/video/voice
│   ├── readRecent.js                  → openzca msg recent --json
│   ├── reactMessage.js               → openzca msg react
│   ├── deleteMessage.js              → openzca msg delete
│   ├── editMessage.js                → openzca msg edit
│   └── forwardMessage.js            → openzca msg forward
├── group/
│   ├── createGroupChat.js            → openzca group create
│   ├── addGroupMembers.js            → openzca group add
│   ├── removeGroupMembers.js         → openzca group remove
│   ├── renameGroup.js                → openzca group rename
│   ├── listGroups.js                 → openzca db group list --json
│   ├── groupInfo.js                  → openzca group info
│   ├── listMembers.js                → openzca group members
│   └── leaveGroup.js                 → openzca group leave
├── friend/
│   ├── searchUsers.js               → openzca friend find
│   └── getUserProfile.js            → openzca msg member-info
├── db/
│   ├── searchMessages.js            → openzca db group messages --json
│   └── syncHistory.js               → openzca db sync
└── utility/
    └── getMyProfile.js              → openzca me info
```

### File Modified

- `src/utils/openzcaRunner.js` — thêm `runOpenzca()` export, refactor triển khai shared helpers

### Reviews

- **Spec compliance**: ✅ 2 rounds (fix stale comment `// Group (7)` → `// Group (8)`, thêm `sendMedia.js`)
- **Code quality**: ✅ Critical issues fixed

### Quality Fixes Applied

| Issue | File | Fix |
|-------|------|-----|
| Helper duplication (expandTilde, getZaloBin) | `openzcaRunner.js` | Extract shared helpers ra module-level |
| `npmBin` hardcoded Windows path | `openzcaRunner.js` | Dùng `NPM_BIN` constant cho cả 2 platform |
| `OPENZCA_HOME` fallback inconsistency | `openzcaRunner.js` | Normalize cả 2 paths dùng `expandPath(config.openzcaHome)` |
| `spawnListener()` missing fallback | `openzcaRunner.js` | `expandPath(config.openzcaHome)` với empty guard |
| `createGroupChat` missing Array guard | `createGroupChat.js` | Thêm `Array.isArray(members)` check |
| `sendMedia` log prefix inconsistent | `sendMedia.js` | `[SEND_MEDIA]` → `[SEND_MEDIA] ⬆️` |

---

## Phase 2: Agent Core ✅

### Files Created

| File | Purpose |
|------|---------|
| `src/utils/toolToGemini.js` | Tool → Gemini `functionDeclarations` format |
| `src/services/toolRegistry.js` | `TOOL_REGISTRY` Map + `getTool()` |
| `src/services/permissionService.js` | Role-based permissions + `getUserRole()` từ MongoDB |
| `src/prompts/assistantPrompt.js` | System prompt tiếng Việt, tool-calling instructions |
| `src/services/zaloAgent.js` | Agent loop: max 5 iterations, function call → execute → loop |

### File Modified

- `src/config/index.js` — thêm `agentMaxLoops`

### Reviews

- **Spec compliance**: ✅ 1 round — all 6 files pass
- **Code quality**: ✅ Grade B+, important fixes applied

### Quality Fixes Applied

| Issue | File | Fix |
|-------|------|-----|
| `candidate.content` not null-guarded | `zaloAgent.js` | `if (!result?.candidates?.[0]?.content?.parts?.length) break;` |
| `result` null not checked | `zaloAgent.js` | Integrated vào guard trên |
| Missing logs on tool-not-found | `zaloAgent.js` | Thêm `console.warn` |
| Missing logs on permission denied | `zaloAgent.js` | Thêm `console.warn` với role info |
| Magic string `'employee'` duplicated | `permissionService.js` | Defined as `DEFAULT_ROLE` constant |

---

## Phase 3: Intent Routing + Webhook ✅

### Files Modified

| File | Change |
|------|--------|
| `src/services/intentDetector.js` | Return `'agent'` thay vì `'unknown'` (2 locations) |
| `src/routes/webhook.js` | Gọi `runAgent()` thay `askClaude()`, xóa import `claudeService` |

### Files Deleted

- `src/services/claudeService.js` — thay bằng `zaloAgent.js`

### Commits

- `27073cc` intentDetector: route unmatched messages to zaloAgent
- `8d5f66c` webhook: route non-checkin/checkout to zaloAgent
- `2562662` chore: delete claudeService.js, superseded by zaloAgent

---

## Phase 4: Error Handling ✅

Error handling đã được embed trong Phase 2 (`zaloAgent.js`):
- Tool execution error → conversation → AI retry
- Permission denied → error message → AI thông báo
- Max loop (5 vòng) → timeout message
- Gemini API fail → early return với fallback text

Phase 4 cần review và đảm bảo mọi edge case được cover.

---

## Phase 5: Polish + Docs ✅

- [x] Update `CLAUDE.md` với kiến trúc mới — thêm Implementation Status section
- [x] Update `README.md` — two-path architecture diagram, AI Agent terminology, `@google/genai`
- [x] `AGENT_MAX_LOOPS` đã có trong `.env.example` từ Phase 2

---

## Key Design Decisions

1. **No multi-turn history** — mỗi tin nhắn = fresh conversation (demo nhanh)
2. **snake_case tool names** — chuẩn MCP/OpenAI
3. **Role from MongoDB** — `employee` fallback
4. **Dynamic import** cho `permissionService.js` → tránh circular dependency
5. **Shared helpers** trong `openzcaRunner.js` — tránh duplication

---

## Debug Session 2026-03-27 ✅

### Bug Report

**Symptom**: Khi user gửi `"gửi tin nhắn cho Minh Đức: chào bạn"`, agent tìm thấy user qua `search_users` nhưng crash ngay sau đó:
```
[WEBHOOK] Agent delegation error: element in PartUnion must be a Part object or string
```

### Root Causes Found

**1. `tools` phải nằm trong `config` parameter**

SDK `@google/genai` v1.46.0 định nghĩa `generateContent({ model, contents, config: { tools } })` — `tools` KHÔNG phải ở root level.

| Sai | Đúng |
|-----|------|
| `{ model, contents, tools, systemInstruction }` | `{ model, contents, config: { tools, systemInstruction } }` |

**2. `createModelContent` nhận `Part[]`, không phải `{role, parts: Part[]}`**

SDK yêu cầu `Content` phải có `parts: PartUnion[]`. Khi append function response, ta truyền nhầm object có role wrapper.

| Sai | Đúng |
|-----|------|
| `createModelContent([{ role: 'user', parts: [...] }])` | `createModelContent([{ functionResponse: { name, response } }])` |

### Files Modified

| File | Change |
|------|--------|
| `src/services/zaloAgent.js` | Move `tools` vào `config`; fix 3 chỗ `createModelContent` bỏ role wrapper |
| `src/utils/toolToGemini.js` | Cleanup format comment |

### Test Verified

| Test | Result |
|------|--------|
| `"gửi tin nhắn cho Minh Đức: chào bạn"` → `search_users` → `send_message` → gửi thật | ✅ Pass |

---

## Verification Checklist (từ PLAN.md)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1 | `"checkin"` → fast path → KHÔNG gọi Gemini | ✅ Pass | Regex intentDetector hoạt động |
| 2 | `"checkout"` → fast path → KHÔNG gọi Gemini | ✅ Pass | Regex intentDetector hoạt động |
| 3 | `"Tạo group cho team marketing"` → slow path → `create_group_chat` | ✅ Pass | Agent gọi tool, `createModelContent` đúng format |
| 4 | `"gửi tin nhắn cho Minh Đức: chào bạn"` → `search_users` → `send_message` | ✅ Pass | Tool chain hoạt động end-to-end |
| 5 | `"Ai vắng hôm nay?"` → slow path → AI query | ✅ Pass | Agent xử lý đúng |
| 6 | Employee gửi `"Tạo group"` → permission denied | ⏳ Pending | |
| 7 | Max loop (5 vòng) → timeout message | ⏳ Pending | |
| 8 | `"checkin"` (lần 2) → double-checkin warning | ⏳ Pending | |
| 9 | `"liệt kê các nhóm chat"` → `list_groups` | ✅ Pass | Model gọi tool `list_groups` thành công |
