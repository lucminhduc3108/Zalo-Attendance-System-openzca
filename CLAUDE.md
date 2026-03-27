# CLAUDE.md — Zalo Attendance System

## Project Overview

Xây dựng hệ thống tự động hóa **chấm công** qua Zalo cho 20-200 nhân viên.

- **Mục tiêu**: Nhân viên nhắn `checkin`/`checkout` → tự động lưu.
- **Quy mô**: 20-200 nhân viên
- **Chạy trên**: Máy local (Windows/Mac)

---

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Runtime** | Node.js + Express.js |
| **Database** | MongoDB Atlas (cloud, free tier 512MB) |
| **AI** | Google Gemini API (@google/genai) |
| **Zalo Transport** | `openzca` CLI (npm) — real-time message listener + sender |

---

## Implementation Status

> **Phase 3 ✅** (2026-03-27): intentDetector.js, webhook.js routing, claudeService.js deleted. All 3 phases complete.

---

## Architecture

### Kiến trúc Tổng quan — AI Tool-Calling Agent

Hệ thống gồm **2 luồng** tách biệt:

#### Fast path — checkin / checkout
Regex → `attendanceService` → reply. **Không qua AI Agent.**

```
Nhân viên nhắn Zalo
         │
         ▼
┌──────────────────────────────────────┐
│  openzca listen --webhook            │
│  POST /hook → Express server         │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Intent Detector v2 (regex)           │
│  checkin|checkout?                     │
└──────────┬─────────────────┬──────────┘
            │ Fast path       │ Slow path
            ▼                 ▼
┌──────────────┐  ┌──────────────────────────┐
│ attendance   │  │ zaloAgent                 │
│ Service      │  │ (AI Tool-Calling Loop)   │
│ (giữ nguyên)│  │                          │
└──────┬───────┘  │ 1. Gemini chọn tool     │
         │        │ 2. Execute tool          │
         └────┬───┘ 3. Loop (max 5)          │
               │      4. Return final text   │
               ▼                             ▼
       openzca msg send → Phản hồi Zalo
```

#### Slow path — AI Agent
Message → Gemini (với tools) → AI chọn tool → execute → loop → response.

---

## Intent Routing

### Fast path: checkin / checkout
```
Intent Detector (regex)
├── /^(checkin|điểm danh|start|in)\b/i → attendanceService.checkin() → reply
└── /^(checkout|out|off|kết thúc)\b/i   → attendanceService.checkout() → reply
```
→ **Không qua AI Agent** — tối ưu performance cho request thường xuyên.

### Slow path: mọi thứ khác
```
→ zaloAgent (AI Tool-Calling Loop)
  1. Gemini generateContent() với tools definitions
  2. AI chọn tool + params phù hợp
  3. Execute tool (openzca CLI / MongoDB)
  4. Append kết quả vào conversation
  5. Lặp lại (max 5 vòng)
  6. Trả final text response
```

---

## Tool System

AI tự chọn tool dựa trên description. Xem chi tiết trong `PLAN.md`.

```
Tool Registry (15 tools)
├── Messaging: send_message, send_media, react_message,
│             read_recent, delete_message, edit_message, forward_message
├── Group: create_group_chat, add_group_members, remove_group_members,
│         rename_group, list_groups, group_info, list_members, leave_group
├── Friend: search_users, get_user_profile
├── DB: search_messages, sync_history
└── Utility: get_my_profile

Attendance = Fast path riêng, KHÔNG trong tool registry
```

---

## Permission Layer

| Tool | employee | manager |
|------|----------|---------|
| send_message, search_users, read_recent, get_profile | ✅ | ✅ |
| create_group_chat, remove_group_members, rename_group, leave_group | ❌ | ✅ |

---

## Project Structure

```
zalo-attendance/
├── src/
│   ├── index.js              ← Entry point, Express server
│   ├── config/
│   │   └── index.js          ← ENV config (MongoDB URI, API keys)
│   ├── routes/
│   │   └── webhook.js        ← POST /hook — Intent routing (fast/slow path)
│   ├── services/
│   │   ├── intentDetector.js ← Intent routing v2 (fast/slow path)
│   │   ├── attendanceService.js ← CRUD checkin/checkout (fast path)
│   │   ├── zaloAgent.js      ← AI Tool-Calling Agent Loop
│   │   ├── toolRegistry.js   ← Tool definitions registry
│   │   ├── permissionService.js ← Role-based permissions
│   │   └── zaloSender.js    ← Gửi tin nhắn qua openzca CLI
│   ├── tools/                ← Tool Interface Layer
│   │   ├── index.js          ← Merge tất cả tools
│   │   ├── messaging/
│   │   │   ├── sendMessage.js
│   │   │   ├── readRecent.js
│   │   │   └── ...
│   │   ├── group/
│   │   │   ├── createGroup.js
│   │   │   ├── addMembers.js
│   │   │   └── ...
│   │   ├── friend/
│   │   │   ├── searchUsers.js
│   │   │   └── getProfile.js
│   │   ├── db/
│   │   │   ├── searchMessages.js
│   │   │   └── syncHistory.js
│   │   └── utility/
│   │       └── myProfile.js
│   ├── models/
│   │   ├── User.js          ← Mongoose: nhân viên
│   │   └── Attendance.js    ← Mongoose: bản ghi chấm công
│   ├── utils/
│   │   ├── openzcaRunner.js ← Chạy openzca listen như subprocess
│   │   └── toolToGemini.js  ← Tool definitions → Gemini format
│   └── prompts/
│       └── assistantPrompt.js ← System prompt cho AI assistant
├── .env.example
├── package.json
└── README.md
```


---

## Intent Flow

```
openzca listen → POST /hook
    │
    ├── Parse JSON payload (msgId, content, senderId, senderName, threadId, chatType)
    │
    ├── intentDetector(content)
    │       │
    │       ├── /^(checkin|điểm danh|start|in)\b/i
    │       │       → attendanceService.checkin() → zaloSender.reply()
    │       │
    │       ├── /^(checkout|out|off|kết thúc)\b/i
    │       │       → attendanceService.checkout() → zaloSender.reply()
    │       │
    │       └── Không match regex
    │               → zaloAgent (AI Tool-Calling Loop)
    │                   → Gemini chọn tool → execute → loop → reply
    │
    └── Response 200 → openzca
```

## Intent Rules

| Intent | Pattern | Route |
|--------|---------|-------|
| `checkin` | `/^(checkin\|điểm danh\|start\|in)\b/i` | Fast path → attendanceService |
| `checkout` | `/^(checkout\|out\|off\|kết thúc)\b/i` | Fast path → attendanceService |
| `agent` | Mọi thứ khác | Slow path → zaloAgent (AI Tool-Calling) |

---

## openzca CLI Reference

> **Phân biệt**: `openzca` (CLI standalone) vs `openzalo` (plugin OpenClaw — KHÔNG dùng)
>
> `opzalo` (@tuyenhx/openzalo) là plugin cho OpenClaw Gateway. KHÔNG thể chạy độc lập. Hệ thống này tự xây AI nên chỉ dùng `openzca` CLI trực tiếp.

Xem thêm file c:\Users\admin\Desktop\OpenZalo\openzcaREADME.md để biết rõ chi tiết các lệnh tương tác với zalo thông qua openzca

### Webhook Payload (từ openzca listen --webhook)
```json
{
  "threadId": "...",
  "msgId": "...",
  "cliMsgId": "...",
  "content": "checkin",
  "msgType": "text",
  "timestamp": 1743000000,
  "senderId": "zalo_id",
  "senderName": "Nguyễn Văn A",
  "chatType": "user",
  "toId": "...",
  "mentions": [],
  "mentionIds": [],
  "mediaPath": null,
  "mediaUrl": null,
  "quote": null,
  "metadata": {
    "threadId": "...",
    "senderId": "zalo_id",
    "toId": "...",
    "mentions": [],
    "mentionIds": []
  }
}
```

---

## Environment Variables

Tạo file `.env` (KHÔNG commit):

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/zalo-attendance
GEMINI_API_KEY=AIzaSy...
PORT=3000
LISTEN_PORT=3000
OPENZCA_HOME=~/.openzca
AGENT_MAX_LOOPS=5
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| MongoDB down | Reply "Hệ thống tạm bảo trì, thử lại sau" |
| Gemini API fail | Reply "Đang bảo trì, thử lại sau" |
| openzca listener down | Auto-restart subprocess |
| User chưa đăng ký | Auto-register với zaloName |
| Double checkin | Warn và không tạo bản ghi mới |
| Duplicate msgId | Skip, không xử lý lại |
| Tool execution error | Graceful error message, continue loop |
| Permission denied | Clear message: "Chỉ quản lý mới có quyền" |
| Agent max loop reached | "Hệ thống đã xử lý nhưng chưa hoàn thành" |

---

## Conventions

- Code style: ESM (import/export), async/await
- Logging: console.log với prefix `[SERVICE_NAME]`
- Reply messages: Tiếng Việt, có emoji
- Payload validation: Check required fields (msgId, senderId, content)
- Tool definitions: Mỗi tool = 1 file, có name, description, params schema, execute()
- Agent loop: max 5 vòng để tránh infinite loop
- Avoid: Không commit `.env`, không hardcode credentials
