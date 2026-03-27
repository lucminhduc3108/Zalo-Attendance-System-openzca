# Kế hoạch Implementation — Zalo AI Assistant

> **Ghi chú**: Hệ thống mới này **thay thế hoàn toàn** hệ thống cũ (attendance-only, text-in → text-out).
> Nó mở rộng thành AI Assistant có khả năng tương tác với Zalo như người dùng thật thông qua tool-calling.

---

## Context

**Hệ thống cũ**: Chỉ xử lý `checkin`/`checkout` qua regex. Mọi câu hỏi khác → Gemini text-in/text-out, không thực thi action.

**Mục tiêu**: Xây lớp **Agent** trên hệ thống hiện tại, giữ nguyên Express + openzca + MongoDB + Gemini.
Hệ thống mới cho phép AI thực sự tương tác với Zalo: tạo group, thêm thành viên, gửi tin nhắn, tìm kiếm user...

---

## Kiến trúc Tổng quan

```
Nhân viên nhắn Zalo
         │
         ▼
┌─────────────────────────────────────────┐
│  openzca listen --webhook               │
│  POST /hook → Express server (port 3000) │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Intent Detector v2                      │
│  (regex: checkin / checkout?)           │
└──────┬──────────────────────┬────────────┘
       │ Fast path            │ Slow path
       ▼                      ▼
┌──────────────┐    ┌─────────────────────────┐
│ attendance   │    │ zaloAgent               │
│ Service      │    │ (AI Tool-Calling Loop)  │
│ (giữ nguyên)│    │                         │
└──────┬───────┘    │ 1. Gemini chọn tool     │
       │            │ 2. Execute tool         │
       └─────┬──────┘ 3. Loop (max 5)         │
             │              │
             ▼              ▼
     openzca msg send → Phản hồi Zalo
```

---

## Intent Routing — 2 Luồng

### Fast path: checkin / checkout
```
Intent Detector (regex)
├── /^(checkin|điểm danh|start|in)\b/i → attendanceService.checkin() → reply
└── /^(checkout|out|off|kết thúc)\b/i   → attendanceService.checkout() → reply
```

→ **KHÔNG qua AI Agent** — regex → thẳng attendanceService → reply
→ Lý do: checkin/checkout xảy ra hàng trăm lần/ngày, không cần tốn chi phí/tgian Gemini

### Slow path: mọi thứ khác
```
→ zaloAgent (AI Agent Loop)
  1. Gọi Gemini với tools definitions + system prompt
  2. Gemini chọn tool + params phù hợp
  3. Execute tool (openzca CLI / MongoDB)
  4. Append kết quả vào conversation
  5. Lặp lại (max 5 vòng)
  6. Trả final text response
```

---

## AI Agent Loop

```
User message
    │
    ▼
┌──────────────────────────────┐
│ Gemini generateContent()      │
│ systemInstruction: prompt    │
│ tools: [tool_definitions]     │
└──────────────┬───────────────┘
               │
        ┌──────┴──────┐
        │             │
   no functionCall  has functionCall
        │             │
        ▼             ▼
   Return text    Check permission
                   │
              ┌────┴────┐
              │         │
           allowed   denied
              │         │
              ▼         ▼
         Execute    Return error
           tool        msg
              │         │
              ▼         │
        Append to   │
       conversation  │
              │     │
              └─────┘
                  │
                  └── Loop back to Gemini
```

---

## Tool System — 15 tools

Tools được định nghĩa rõ ràng, AI tự chọn dựa trên description.

```
Tool Registry (15 tools)
├── Messaging: send_message, send_media, react_message,
│             read_recent, delete_message, edit_message, forward_message
├── Group: create_group_chat, add_group_members, remove_group_members,
│         rename_group, list_groups, group_info, list_members, leave_group
├── Friend: search_users, get_user_profile
├── DB: search_messages, sync_history
└── Utility: get_my_profile

Attendance (checkin/checkout) = Fast path riêng, KHÔNG trong tool registry
```

---

## Permission Layer

```
Role: employee  → được dùng: send_message, search_users, read_recent, get_profile
Role: manager   → được dùng: tất cả + create_group_chat, remove_group_members,
                              rename_group, leave_group
```

---

## Các bước Triển khai

### Phase 1 — Tool Interface Layer
**Mục tiêu**: Xây lớp tool wrappers cho openzca CLI.

**Tasks**:
- [ ] `src/tools/messaging/sendMessage.js` — openzca msg send
- [ ] `src/tools/messaging/readRecent.js` — openzca msg recent --json
- [ ] `src/tools/group/createGroup.js` — openzca group create
- [ ] `src/tools/group/addMembers.js` — openzca group add
- [ ] `src/tools/group/removeMembers.js` — openzca group remove
- [ ] `src/tools/group/renameGroup.js` — openzca group rename
- [ ] `src/tools/group/listGroups.js` — openzca group list
- [ ] `src/tools/group/listMembers.js` — openzca group members
- [ ] `src/tools/group/leaveGroup.js` — openzca group leave
- [ ] `src/tools/friend/searchUsers.js` — openzca friend find
- [ ] `src/tools/friend/getProfile.js` — openzca friend info
- [ ] `src/tools/db/searchMessages.js` — openzca db group messages --json
- [ ] `src/tools/db/syncHistory.js` — openzca db sync
- [ ] `src/tools/utility/myProfile.js` — openzca me info
- [ ] `src/tools/index.js` — merge tất cả → ZALO_TOOLS

### Phase 2 — Agent Core
**Mục tiêu**: Xây AI Agent loop.

**Tasks**:
- [ ] `src/utils/toolToGemini.js` — convert tool definitions → Gemini format
- [ ] `src/services/toolRegistry.js` — TOOL_REGISTRY + getTool()
- [ ] `src/services/permissionService.js` — checkPermission()
- [ ] `src/prompts/assistantPrompt.js` — system prompt cho AI assistant
- [ ] `src/services/zaloAgent.js` — agent loop chính
- [ ] Test: agent loop gọi 1 tool → response đúng

### Phase 3 — Intent Detector v2 + Webhook
**Mục tiêu**: Cập nhật webhook để routing fast/slow path.

**Tasks**:
- [ ] `src/services/intentDetector.js` — sửa: fast path + `agent` route
- [ ] `src/routes/webhook.js` — fast path → attendanceService, slow path → zaloAgent
- [ ] Regression test: "checkin" → KHÔNG gọi Gemini
- [ ] Integration test: "Tạo group" → slow path → create_group_chat tool

### Phase 4 — Error Handling
**Mục tiêu**: Hệ thống robust.

**Tasks**:
- [ ] Tool execution error → graceful error message
- [ ] Permission denied → clear message
- [ ] Max loop reached → timeout message
- [ ] Gemini API fail → fallback text response
- [ ] Duplicate msgId skip (in-memory Set)

### Phase 5 — Polish & Documentation
**Mục tiêu**: Hoàn thiện.

**Tasks**:
- [ ] Update CLAUDE.md với kiến trúc mới
- [ ] README.md — hướng dẫn setup + sử dụng tools mới
- [ ] Xóa `src/services/claudeService.js` cũ (text-in/text-out)

---

## Critical Files — Hệ thống mới

| File | Phase | Mô tả |
|------|-------|-------|
| `src/tools/*.js` | 1 | Tool wrappers cho openzca CLI |
| `src/utils/toolToGemini.js` | 2 | Tool → Gemini function declarations |
| `src/services/toolRegistry.js` | 2 | TOOL_REGISTRY + getTool() |
| `src/services/permissionService.js` | 2 | Role-based permissions |
| `src/prompts/assistantPrompt.js` | 2 | System prompt AI assistant |
| `src/services/zaloAgent.js` | 2 | Agent loop chính |
| `src/services/intentDetector.js` | 3 | Intent routing v2 |
| `src/routes/webhook.js` | 3 | Fast path + slow path routing |

**Giữ nguyên** (không đổi):
- `src/services/attendanceService.js` — fast path riêng
- `src/services/zaloSender.js` — wrapper openzca msg send
- `src/utils/openzcaRunner.js` — subprocess management
- `src/models/User.js` — schema
- `src/models/Attendance.js` — schema
- `src/index.js` — server entry point

**Xóa**:
- `src/services/claudeService.js` — thay bằng zaloAgent.js

---

## Verification

1. `"checkin"` → fast path → KHÔNG gọi Gemini → ghi vào DB ✅
2. `"checkout"` → fast path → KHÔNG gọi Gemini ✅
3. `"Tạo group cho team marketing"` → slow path → Gemini → `create_group_chat` ✅
4. `"Ai vắng hôm nay?"` → slow path → Gemini → `search_users` + attendance query ✅
5. Employee gửi `"Tạo group"` → bị chặn bởi permission layer ✅
6. `"Tạo group Marketing, thêm Lan"` → AI multi-step: search_users → create_group_chat ✅
7. `"checkin"` (lần 2) → double-checkin warning ✅
8. Max loop (5 vòng) → timeout message ✅

---

## Dependencies

- Node.js 22.13+ (openzca yêu cầu)
- MongoDB Atlas cluster (free tier)
- Zalo account đã login: `openzca auth login`
- `npm i -g openzca@latest`
- `GEMINI_API_KEY` trong `.env`
