# Zalo Attendance System

Hệ thống chấm công tự động qua Zalo cho 20–200 nhân viên.

Nhân viên nhắn `checkin` / `checkout` → hệ thống tự lưu vào MongoDB, phản hồi ngay qua Zalo. Mọi câu hỏi khác (danh sách vắng, thống kê...) được Claude AI xử lý.

---

## Prerequisites

- **Node.js** 18+
- **MongoDB Atlas** cluster (free tier 512MB)
- **Zalo account** đã đăng nhập trên máy
- **openzca CLI** đã cài đặt và auth

## Setup

### 1. Cài đặt phụ thuộc

```bash
npm install
```

### 2. Cài đặt openzca

```bash
npm i -g openzca@latest
openzca auth login
```

Làm theo hướng dẫn QR code để login Zalo.

### 3. Cấu hình môi trường

```bash
cp .env.example .env
```

Sửa `.env`:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/zalo-attendance
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=3000
OPENZCA_HOME=~/.openzca
```

### 4. Chạy server

**Chế độ production:**
```bash
npm start
```

**Chế độ development** (auto-reload khi sửa code):
```bash
npm run dev
```

Server khởi động trên `http://localhost:3000`, tự động chạy `openzca listen` và kết nối MongoDB.

### 5. Webhook URL cho local development

Nếu chạy local, cần expose port 3000 ra internet để openzca gửi webhook:

```bash
# ngrok (recommended)
ngrok http 3000

# Sau đó đăng ký URL với openzca:
# openzca listen --webhook https://<your-ngrok-id>.ngrok.io/hook --keep-alive
```

> **Lưu ý:** openzca đã được tích hợp vào `src/index.js` — không cần chạy lệnh trên thủ công. Chỉ cần `npm start` / `npm run dev`.

---

## Cách sử dụng

Nhân viên nhắn tin cho Zalo account đã login với openzca:

### Checkin
```
checkin
checkin làm ở nhà
điểm danh
```

### Checkout
```
checkout
checkout đi gặp khách
kết thúc
```

### Hỏi thống kê (Claude AI)
```
Ai chưa checkin hôm nay?
Ai checkout sớm hơn 17h?
Tổng hợp tuần này
Ai hay đi muộn?
```

---

## Architecture

```
Nhân viên nhắn Zalo
         │
         ▼
┌──────────────────────────────────┐
│  openzca listen --webhook :3000   │  ← Realtime message stream
│  POST /hook → Express server     │
└─────────────┬────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│  Express.js (port 3000)          │
│  POST /hook                      │
│  ├── intentDetector (regex)       │
│  │   ├── checkin → MongoDB.save   │
│  │   └── checkout → MongoDB.update│
│  └── unknown → Claude API → reply │
└─────────────┬────────────────────┘
              │
              ▼
    openzca msg send <threadId> <msg>
```

---

## Data Models

### `users` collection
```json
{
  "zaloId": "string",
  "zaloName": "string",
  "alias": "string | null",
  "role": "employee | manager",
  "department": "string",
  "registeredAt": "Date",
  "isActive": true
}
```

### `attendances` collection
```json
{
  "zaloId": "string",
  "userName": "string",
  "date": "YYYY-MM-DD",
  "checkin": "Date | null",
  "checkinNote": "string",
  "checkout": "Date | null",
  "checkoutNote": "string",
  "status": "completed | missing_checkout"
}
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Double checkin | Cảnh báo: đã checkin lúc XX:XX |
| Checkout không checkin | Cảnh báo: chưa checkin hôm nay |
| MongoDB down | Reply "Hệ thống tạm bảo trì" |
| Claude API fail | Reply "Đang bảo trì, thử lại sau" |
| Duplicate msgId | Skip, không xử lý lại |
| User chưa đăng ký | Auto-register với zaloName |
| openzca crash | Auto-restart sau 5s (tối đa 10 lần) |

---

## API Reference

### `POST /hook`
Webhook endpoint nhận tin từ openzca.

**Request body:**
```json
{
  "threadId": "...",
  "msgId": "...",
  "content": "checkin",
  "type": "text",
  "senderId": "zalo_id",
  "senderName": "Nguyễn Văn A",
  "chatType": "user",
  "timestamp": 1743000000
}
```

**Response:**
```json
{ "handled": true, "intent": "checkin" }
```

### `GET /`
Health check endpoint.
```json
{ "status": "ok", "message": "Zalo Attendance System running" }
```

---

## Scripts

| Command | Mục đích |
|---------|----------|
| `npm start` | Chạy production (server + listener) |
| `npm run dev` | Chạy dev mode với `--watch` reload |

---

## Dependencies

- **express** — HTTP server
- **mongoose** — MongoDB ODM
- **@anthropic-ai/sdk** — Claude AI
- **dotenv** — ENV loader
