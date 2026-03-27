# 📋 Zalo Attendance System — Project Report

> **Ngày tạo:** 2026-03-26
> **Version:** 1.0.0
> **Mục tiêu:** Tự động hóa chấm công qua Zalo cho 20–200 nhân viên

---

## 1. Kiến Trúc Hệ Thống (Tổng Quan)

```
Nhân viên nhắn Zalo
         │
         ▼
┌──────────────────────────────────────────────────┐
│  🌐 ZALO LAYER                                   │
│  openzca listen --webhook http://localhost:3000/hook
│  (subprocess, auto-restart khi crash)
└──────────────────────────┬───────────────────────┘
                           │ HTTP POST /hook
                           ▼
┌──────────────────────────────────────────────────┐
│  ⚙️  BACKEND LAYER (Express.js — port 3000)       │
│  1. Validate payload (msgId, senderId, content)  │
│  2. Skip duplicate msgId (in-memory Set)         │
│  3. Auto-register user (nếu chưa có)             │
│  4. Intent detection (regex)                     │
│     ├── checkin  → attendanceService.checkin()    │
│     ├── checkout → attendanceService.checkout()  │
│     └── unknown  → askClaude() (Gemini AI)        │
│  5. Reply via zaloSender → openzca msg send      │
└──────────────────────────┬───────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  📦 DATABASE LAYER       │  │  🤖 AI LAYER             │
│  MongoDB Atlas           │  │  Google Gemini API       │
│  ├── users collection    │  │  Model: gemini-3-flash   │
│  └── attendances         │  │  Xử lý: câu hỏi thống kê │
└──────────────────────────┘  └──────────────────────────┘
```

---

## 2. Các Thành Phần Hệ Thống

### 🤖 AI Layer

| Thành phần | File | Mô tả |
|-----------|------|--------|
| **Gemini API** | `src/services/claudeService.js` | Gọi Gemini để trả lời câu hỏi thống kê chấm công |
| **System Prompt** | `src/prompts/attendancePrompt.js` | Hướng dẫn AI trả lời tiếng Việt, ngắn gọn, đúng ngữ cảnh |

> **AI Layer xử lý:** Những intent không phải `checkin`/`checkout` — ví dụ: "Ai chưa checkin hôm nay?", "Tổng hợp tuần này", "Ai hay đi muộn?"

---

### ⚙️ Backend Layer (Node.js / Express)

| Thành phần | File | Mô tả |
|-----------|------|--------|
| **Entry Point** | `src/index.js` | Kết nối MongoDB → start Express server + openzca listener |
| **Webhook Handler** | `src/routes/webhook.js` | Nhận payload từ openzca, điều phối intent, deduplicate msgId, safeSend reply |
| **Config Loader** | `src/config/index.js` | Load biến môi trường: port, MONGO_URI, GEMINI_API_KEY, OPENZCA_HOME |
| **Intent Detector** | `src/services/intentDetector.js` | Regex phân loại intent: checkin / checkout / unknown |
| **Attendance Service** | `src/services/attendanceService.js` | Logic CRUD checkin & checkout: tạo record, tính thời gian, trích note, validate |
| **Zalo Sender** | `src/services/zaloSender.js` | Spawn subprocess `openzca msg send` để gửi reply về Zalo |
| **openzca Runner** | `src/utils/openzcaRunner.js` | Quản lý subprocess `openzca listen`: spawn, auto-restart (5s, max 10 lần), stop gracefully |

---

### 📦 Database Layer (MongoDB Atlas)

| Thành phần | File | Schema |
|-----------|------|--------|
| **User Model** | `src/models/User.js` | Lưu thông tin nhân viên: zaloId, zaloName, role, department, isActive |
| **Attendance Model** | `src/models/Attendance.js` | Lưu bản ghi chấm công: zaloId, date, checkin, checkout, status, notes |

> **Database Layer xử lý:** Lưu trữ & truy vấn dữ liệu users và attendances. Unique index trên `{ zaloId + date }`.

---

### 🌐 Zalo Transport Layer (openzca CLI)

| Thành phần | Lệnh | Mô tả |
|-----------|------|--------|
| **Listener** | `openzca listen --webhook http://localhost:3000/hook --keep-alive` | Real-time nhận tin nhắn Zalo → POST webhook |
| **Message Sender** | `openzca msg send <threadId> <msg>` | Gửi phản hồi về Zalo (DM hoặc group) |

---

### 📁 File & Thư Mục

```
zalo-attendance/
├── src/
│   ├── index.js              ← Entry point
│   ├── config/
│   │   └── index.js          ← ENV loader
│   ├── routes/
│   │   └── webhook.js        ← POST /hook
│   ├── services/
│   │   ├── intentDetector.js  ← Regex intent classifier
│   │   ├── attendanceService.js ← CRUD checkin/checkout
│   │   ├── claudeService.js  ← Gemini API caller
│   │   └── zaloSender.js     ← openzca msg send wrapper
│   ├── models/
│   │   ├── index.js          ← Re-export
│   │   ├── User.js           ← User schema
│   │   └── Attendance.js     ← Attendance schema
│   ├── utils/
│   │   └── openzcaRunner.js  ← Subprocess manager
│   └── prompts/
│       └── attendancePrompt.js ← System prompt cho AI
├── .env.example
├── package.json
└── README.md
```

---

## 4. Tổng Quan

Nhân viên nhắn tin Zalo (`checkin`/`checkout`) → hệ thống tự lưu vào MongoDB và phản hồi ngay. Mọi câu hỏi khác (danh sách vắng, thống kê...) được Gemini AI xử lý.

### Người dùng mục tiêu
- Nhân viên công ty (20–200 người)
- chỉ cần nhắn Zalo

### Quy mô & Nền tảng
- **Chạy trên:** Máy local (Windows/Mac)
- **Quy mô:** 20–200 nhân viên

---

## 5. Tech Stack

| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| Runtime | Node.js 18+ | — |
| HTTP Server | Express.js | ^5.1.0 |
| Database | MongoDB Atlas (Mongoose ODM) | ^8.15.0 |
| AI | Google Gemini API (`@google/genai`) | ^1.46.0 |
| Zalo Transport | `openzca` CLI (npm global) | latest |
| ENV | dotenv | ^16.5.0 |

> **Lưu ý:** README ghi nhầm là `@anthropic-ai/sdk` và `ANTHROPIC_API_KEY`. Code thực tế dùng **`@google/genai`** + **`GEMINI_API_KEY`**.

---

---

## 7. Cấu Trúc File Chi Tiết

```
zalo-attendance/
├── src/
│   ├── index.js              ← Entry point: kết nối MongoDB → start Express + listener
│   ├── config/
│   │   └── index.js          ← Load ENV (port, MONGO_URI, GEMINI_API_KEY, OPENZCA_HOME)
│   ├── routes/
│   │   └── webhook.js        ← POST /hook — nhận payload từ openzca, điều phối intent
│   ├── services/
│   │   ├── intentDetector.js  ← Regex phân loại: checkin | checkout | unknown
│   │   ├── attendanceService.js ← CRUD checkin/checkout với MongoDB
│   │   ├── claudeService.js  ← Gọi Gemini API cho intent "unknown"
│   │   └── zaloSender.js     ← Wrapper spawn `openzca msg send`
│   ├── models/
│   │   ├── index.js          ← Re-export User + Attendance
│   │   ├── User.js           ← Mongoose schema: nhân viên
│   │   └── Attendance.js      ← Mongoose schema: bản ghi chấm công
│   ├── utils/
│   │   └── openzcaRunner.js  ← Spawn `openzca listen` subprocess + auto-restart
│   └── prompts/
│       └── attendancePrompt.js ← System prompt tiếng Việt cho Gemini
├── .env.example
├── package.json
└── README.md
```

---

## 8. Chi Tiết Từng Module

### 5.1 `src/config/index.js`
Load biến môi trường qua `dotenv`. Cung cấp:
- `port` (default: 3000)
- `mongoUri` (default: `mongodb://localhost:27017/zalo-attendance`)
- `geminiApiKey`
- `openzcaHome` (default: `~/.openzca`)

### 5.2 `src/routes/webhook.js`
- **POST `/hook`** — endpoint nhận payload từ `openzca listen`
- **In-memory deduplication:** `processedIds` Set (max 10.000, tự cleanup nửa khi đầy)
- **Auto-register user:** tạo bản ghi `User` mới nếu `zaloId` chưa có
- **Intent routing:**
  - `checkin` → `attendanceService.checkin()` → reply
  - `checkout` → `attendanceService.checkout()` → reply
  - `unknown` → `askClaude()` → reply hoặc fallback message
- **Error handling:**
  - MongoDB down → `safeSend()` reply "Hệ thống tạm bảo trì" + HTTP 503
  - Claude fail → reply "Đang bảo trì" + HTTP 500
- **`safeSend()`:** wrapper bắt lỗi send, không crash webhook

### 5.3 `src/services/intentDetector.js`
Phân loại intent bằng regex (không cần AI):

| Intent | Pattern |
|--------|---------|
| `checkin` | `/^(checkin\|điểm danh\|start\|in)\b/i` |
| `checkout` | `/^(checkout\|out\|off\|kết thúc)\b/i` |
| `unknown` | Mọi thứ còn lại → chuyển Gemini |

### 5.4 `src/services/attendanceService.js`
**`checkin(sender, content)`:**
1. Auto-register user
2. Kiểm tra double checkin → warn nếu đã checkin hôm nay
3. Tạo Attendance record với `status: 'missing_checkout'`
4. Trích note sau keyword (`"checkin làm ở nhà"` → note = `"làm ở nhà"`)
5. Reply: emoji 🌅/👋 tùy giờ, thời gian, ngày, note

**`checkout(sender, content)`:**
1. Auto-register user
2. Tìm Attendance hôm nay theo `zaloId + date`
3. Cảnh báo nếu chưa checkin hoặc đã checkout
4. Cập nhật `checkout`, `checkoutNote`, `status: 'completed'`
5. Tính tổng thời gian làm việc (hours + minutes) → reply

### 5.5 `src/services/claudeService.js`
**`askClaude(question, sender)`:**
1. Build rich context từ MongoDB (top 100 records gần nhất + danh sách user active)
2. Gọi Gemini API với model `gemini-3-flash-preview`
3. Trả về text reply từ Gemini
4. Fallback: "🤖 API key chưa được cấu hình" nếu thiếu key

### 5.6 `src/services/zaloSender.js`
- **`sendMessage(threadId, message, { isGroup, timeoutMs })`**
- Spawn `openzca msg send <threadId> <msg> [--group]`
- Platform-aware: Windows dùng `cmd /c zca.cmd`, Linux/Mac dùng `zca`
- 15 giây timeout mặc định, auto-kill process
- Message được wrap quote trên Windows để tránh bị cmd.exe split argument

### 5.7 `src/models/User.js`
```javascript
{
  zaloId: String (unique, required),
  zaloName: String (required),
  alias: String (nullable),
  role: 'employee' | 'manager' (default: 'employee'),
  department: String (default: ''),
  registeredAt: Date (default: now),
  isActive: Boolean (default: true),
  timestamps: true  // createdAt, updatedAt
}
```

### 5.8 `src/models/Attendance.js`
```javascript
{
  zaloId: String (required),
  userName: String (required),
  date: String (required, "YYYY-MM-DD"),
  checkin: Date (default: null),
  checkinNote: String (default: ''),
  checkout: Date (default: null),
  checkoutNote: String (default: ''),
  status: 'completed' | 'missing_checkout' (default: 'missing_checkout'),
  timestamps: true
}
// Index: { zaloId: 1, date: 1 } (unique)
```

### 5.9 `src/utils/openzcaRunner.js`
- **`startListener()`** — spawn `openzca listen --webhook http://localhost:3000/hook --keep-alive`
  - Idempotent (skip nếu đã chạy)
  - Platform-aware: Windows → `cmd /c zca.cmd`, Unix → `zca`
- **`stopListener()`** — kill subprocess, set `restarting = false`
- **Auto-restart:** nếu process crash/exit → restart sau 5s
  - Tối đa 10 lần restart, sau đó dừng và log lỗi
  - `restarting` flag ngăn restart chồng nhau
- stdout/stderr của subprocess được pipe ra terminal với prefix `[openzca|out]` / `[openzca|err]`

### 5.10 `src/prompts/attendancePrompt.js`
System prompt cho Gemini — hướng dẫn AI:
- Trả lời tiếng Việt, có emoji, ngắn gọn (5–7 dòng)
- Cách query MongoDB (date format, field names)
- 5 loại câu hỏi thường gặp và cách trả lời
- Từ chối nếu câu hỏi không liên quan chấm công

---

## 9. Data Flow Hoàn Chỉnh

```
1. User nhắn "checkin" trên Zalo
       ↓
2. openzca nhận message → POST /hook
       ↓
3. webhook.js: validate payload
       ↓
4. webhook.js: deduplicate msgId (Set)
       ↓
5. webhook.js: ensureUser() → auto-register nếu mới
       ↓
6. intentDetector: detectIntent("checkin") → "checkin"
       ↓
7. attendanceService.checkin()
   ├── Tạo Attendance record { zaloId, date, checkin, status: 'missing_checkout' }
   └── Trả về message string
       ↓
8. zaloSender: safeSend(threadId, message)
   → spawn `openzca msg send <threadId> <message>`
       ↓
9. User nhận reply Zalo: "✅ Checkin thành công! ..."
```

---

## 10. Error Handling

| Scenario | Handling |
|----------|----------|
| Payload thiếu trường | Skip, log warn, return `{ handled: false }` |
| Duplicate msgId | Skip (Set deduplication) |
| MongoDB down | Reply "🔧 Hệ thống tạm bảo trì" + HTTP 503 |
| Gemini API fail | Reply "🔧 Đang bảo trì" + HTTP 500 |
| openzca listener crash | Auto-restart sau 5s, tối đa 10 lần |
| Double checkin | Reply warn, không tạo record mới |
| Checkout không checkin | Reply warn "chưa checkin hôm nay" |
| openzca msg send timeout (15s) | Reject, log warn |
| User chưa đăng ký | Auto-create User với zaloName |

---

## 11. Các Bước Triển Khai Hệ Thống

Phần này trình bày chi tiết các bước để triển khai hệ thống chấm công Zalo từ đầu, phù hợp cho người phụ trách kỹ thuật hoặc quản trị viên.

---

### Bước 1: Chuẩn bị các tài khoản và công cụ cần thiết

Trước khi bắt đầu, cần đảm bảo đã có đầy đủ các tài khoản và phần mềm sau trên máy chủ hoặc máy tính cục bộ dự định chạy hệ thống.

**Về phần mềm nền tảng**, máy cần được cài đặt Node.js phiên bản 18 trở lên. Có thể tải và cài đặt từ trang chủ nodejs.org. Sau khi cài xong, xác nhận phiên bản bằng lệnh `node -v` trong terminal.

**Về cơ sở dữ liệu**, hệ thống sử dụng MongoDB Atlas — dịch vụ MongoDB trên đám mây có gói miễn phí 512MB, phù hợp cho quy mô 20–200 nhân viên. Cần tạo một tài khoản MongoDB Atlas tại mongodb.com, tạo một cluster mới (chọn khu vực gần Việt Nam như Singapore hoặc Jakarta để giảm độ trễ), tạo một database có tên `zalo-attendance`, và tạo một người dùng database (database user) với quyền đọc/ghi. Ghi lại chuỗi kết nối (connection string) có dạng `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/zalo-attendance` để sử dụng ở bước sau.

**Về Zalo**, cần có một tài khoản Zalo đã đăng nhập trên máy chạy hệ thống. Tài khoản này sẽ được sử dụng làm "tài khoản chấm công" — nhân viên sẽ nhắn tin đến tài khoản này để thực hiện checkin và checkout.

**Về API AI**, hệ thống sử dụng Google Gemini API để xử lý các câu hỏi thống kê từ nhân viên. Cần đăng ký tài khoản Google Cloud và bật Gemini API, sau đó tạo một API key từ Google AI Studio. API key này sẽ được đặt trong file cấu hình ở bước tiếp theo.

---

### Bước 2: Tải mã nguồn và cài đặt các thư viện phụ thuộc

Sau khi đã có đầy đủ các tài khoản cần thiết, bước tiếp theo là tải mã nguồn về máy và cài đặt các thư viện. Từ thư mục gốc của project, chạy lệnh `npm install` để Node.js tự động tải và cài đặt tất cả các thư viện được liệt kê trong file `package.json`, bao gồm Express.js, Mongoose, Google Gemini SDK và dotenv.

Tiếp theo, cài đặt công cụ dòng lệnh openzca một cách toàn cục bằng lệnh `npm i -g openzca@latest`. Đây là công cụ do cộng đồng phát triển, đóng vai trò cầu nối giữa ứng dụng và Zalo — cho phép nhận tin nhắn real-time và gửi phản hồi về Zalo thông qua dòng lệnh.

---

### Bước 3: Xác thực tài khoản Zalo với openzca

Sau khi openzca được cài đặt, cần đăng nhập tài khoản Zalo vào openzca để ứng dụng có quyền đọc và gửi tin nhắn. Chạy lệnh `openzca auth login` trên máy chạy hệ thống. openzca sẽ hiển thị một mã QR trên terminal. Mở ứng dụng Zalo trên điện thoại, quét mã QR đó để xác thực. Quá trình xác thực chỉ cần thực hiện một lần. Lưu ý rằng phiên đăng nhập có thể hết hạn sau một khoảng thời gian nhất định và cần được làm mới.

---

### Bước 4: Tạo và cấu hình file biến môi trường

Hệ thống sử dụng file `.env` để lưu trữ các thông tin nhạy cảm như chuỗi kết nối database và API key. File này không được đưa lên git vì chứa thông tin bí mật. Để tạo file, sao chép nội dung từ file mẫu `.env.example` đã có sẵn trong project, sau đó điền các giá trị thực tế.

Cụ thể, cần khai báo bốn biến chính. Biến `MONGO_URI` nhận chuỗi kết nối MongoDB Atlas đã chuẩn bị ở Bước 1. Biến `GEMINI_API_KEY` nhận API key của Google Gemini. Biến `PORT` xác định cổng chạy Express server, mặc định là 3000. Biến `OPENZCA_HOME` trỏ đến thư mục lưu trữ cấu hình và phiên đăng nhập của openzca, thường để mặc định là `~/.openzca`.

---

### Bước 5: Khởi động hệ thống

Sau khi hoàn tất bốn bước trên, hệ thống đã sẵn sàng để chạy. Có hai chế độ khởi động. Chế độ thứ nhất dành cho môi trường sản xuất, chạy lệnh `npm start` — chương trình sẽ kết nối đến MongoDB Atlas, khởi động Express server trên cổng 3000, và tự động spawn subprocess `openzca listen` để bắt đầu lắng nghe tin nhắn từ Zalo. Chế độ thứ hai dành cho quá trình phát triển và kiểm tra, chạy lệnh `npm run dev` — tương tự nhưng bổ sung tính năng tự tải lại mã nguồn mỗi khi có thay đổi, giúp developer không cần khởi động lại thủ công.

Nếu khởi động thành công, terminal sẽ hiển thị các thông báo xác nhận đã kết nối MongoDB, Express server đang lắng nghe trên cổng 3000, và openzca listener đã được khởi chạy.

---

### Bước 6: Kiểm tra hệ thống

Để xác nhận hệ thống hoạt động đúng, mở trình duyệt web và truy cập địa chỉ `http://localhost:3000/`. Nếu nhận được phản hồi JSON có dạng `{ "status": "ok", "message": "Zalo Attendance System running" }`, đồng nghĩa Express server đã khởi động thành công.

Tiếp theo, thử gửi một tin nhắn `checkin` từ ứng dụng Zalo đến tài khoản đã đăng nhập ở Bước 3. Nếu hệ thống hoạt động đúng, tài khoản Zalo đó sẽ nhận được phản hồi tự động có nội dung xác nhận checkin thành công kèm theo thời gian và ngày. Tương tự, thử gửi `checkout` để kiểm tra luồng checkout.

Nếu gửi một tin nhắn không phải checkin hoặc checkout, ví dụ "Ai chưa checkin hôm nay?", hệ thống sẽ chuyển tin nhắn đó sang Gemini API và trả lời bằng nội dung thống kê tương ứng.

---

### Bước 7: Vận hành và mở rộng (nếu cần)

Trong quá trình vận hành thực tế, cần lưu ý một số điểm sau. Thứ nhất, nếu muốn expose server ra internet để nhân viên ở các địa điểm khác nhau có thể truy cập mà không cùng mạng nội bộ, cần sử dụng một công cụ như ngrok để tạo public URL cho cổng 3000. Khi đó, cần cập nhật lại webhook URL trong lệnh khởi chạy openzca để trỏ đến URL công khai của ngrok thay vì localhost. Thứ hai, phiên đăng nhập Zalo trong openzca có thể hết hạn — nếu hệ thống ngừng nhận và gửi tin nhắn, cần chạy lại `openzca auth login` để làm mới phiên. Thứ ba, cần sao lưu định kỳ dữ liệu trên MongoDB Atlas, đặc biệt khi hệ thống đã hoạt động lâu dài với nhiều bản ghi chấm công. Thứ tư, với quy mô lớn hơn 200 nhân viên, nên cân nhắc nâng cấp từ gói MongoDB miễn phí sang gói trả phí để đảm bảo hiệu năng.

---

## 12. Scripts Vận Hành

---

## 13. Các Lưu Ý Quan Trọng

1. **README nhầm AI provider:** Ghi `@anthropic-ai/sdk` + `ANTHROPIC_API_KEY`, nhưng code thực tế dùng `@google/genai` + `GEMINI_API_KEY`. Cần cập nhật README để trùng khớp.

2. **openzca CLI vs openzalo plugin:** Hệ thống dùng `openzca` CLI standalone, không phải `@tuyenhx/openzalo` (plugin OpenClaw).

3. **Webhook URL cho local:** Nếu chạy local không có public IP, cần ngrok để expose port 3000, sau đó truyền URL vào `openzca listen --webhook`.

4. **Platform-aware:** `openzcaRunner.js` và `zaloSender.js` xử lý riêng Windows (`cmd /c zca.cmd`) và Unix (`zca`) để tránh DEP0190 và argument-splitting.

5. **Deduplication strategy:** In-memory Set (max 10.000) — không persist qua restart. Lý tưởng cho demo/local; production nên dùng Redis.

6. **Gemini model:** `gemini-3-flash-preview` — model mới nhất tại thời điểm code, có thể cần cập nhật tên model khi Gemini ra bản stable.

---

## 14. Dependencies (package.json)

```json
{
  "@google/genai": "^1.46.0",
  "dotenv": "^16.5.0",
  "express": "^5.1.0",
  "mongoose": "^8.15.0"
}
```
