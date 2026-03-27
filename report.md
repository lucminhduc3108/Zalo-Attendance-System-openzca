# Báo cáo Triển khai: Hệ thống Chấm công Zalo Tích hợp AI

---

## 1. Tổng quan phương án (Overview)

**Phương án:** Xây dựng hệ thống chấm công tự động qua tin nhắn Zalo, tích hợp AI Agent để hỗ trợ nhân viên trả lời câu hỏi và quản lý nhóm.

**Vấn đề giải quyết:**

Trong một số nhóm ngành dịch vụ ngắn hạn, doanh nghiệp có xu hướng thuê nhân viên theo ngắn hạn. Việc quản lý nhóm nhân viên này theo cách truyền thống như sử dụng máy vân tay hoặc quét mặt thường tốn công sức và chi phí.

| Phương pháp truyền thống | Hạn chế |
|---|---|
| Máy vân tay | Tắc nghẽn giờ cao điểm, không check-in từ xa, dễ lỗi thiết bị |
| Máy quét mặt | Chi phí cao, cần cài đặt tại chỗ, không phù hợp nhân viên thời vụ |
| Excel / Google Sheets thủ công | Tốn thời gian, dễ sai sót, không cập nhật realtime |

**Đối tượng khách hàng:** Các doanh nghiệp hay sử dụng nhân viên thời vụ (nhân viên có thời gian làm ngắn, ít hơn so với nhân viên chính thức).

---

## 2. Mục tiêu (Objectives)

### Mục tiêu chức năng (Functional)

- Nhân viên nhắn `checkin` / `checkout` qua Zalo → hệ thống tự ghi nhận và lưu vào database
- Xác nhận trạng thái phản hồi ngay qua Zalo
- Tổng hợp số liệu chấm công theo ngày / tháng
- AI Agent trả lời câu hỏi của nhân viên (ví dụ: "Ai chưa checkin hôm nay?", "Tổng hợp tuần này")
- Tự động nhắc nhở checkin/checkout

### Mục tiêu phi chức năng (Non-functional)

- **Hiệu năng:** Checkin/checkout phản hồi dưới 2 giây (fast path — không qua AI)
- **Chi phí:** Tối thiểu, chỉ sử dụng Gemini API free tier
- **Độ ổn định:** Chạy trên máy local, tự khởi động lại nếu openzca bị lỗi
- **Mở rộng:** Dễ dàng thêm tool mới cho AI Agent (tạo group, gửi tin nhắn, tìm user...)

---

## 3. Ý tưởng & nguyên lý hoạt động (Concept / Approach)

Hệ thống hoạt động theo nguyên lý **AI Tool-Calling Agent**:

1. **Nhân viên nhắn tin** cho Zalo account đã đăng nhập trên openzca
2. **openzca CLI** lắng nghe realtime → gửi webhook POST `/hook` đến Express server
3. **Intent Detector** (regex) phân loại intent:
   - `checkin` / `checkout` → **Fast path**: ghi DB → reply ngay (không qua AI)
   - Câu hỏi khác → **Slow path**: AI Agent xử lý
4. **AI Agent (slow path):** Gemini chọn tool phù hợp → execute → loop (max 5 vòng) → reply Zalo
5. **openzca msg send** → phản hồi tin nhắn qua Zalo

---

## 4. Kiến trúc hệ thống (System Architecture)

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
│  checkin|checkout?                   │
└──────┬─────────────────┬─────────────┘
       │ Fast path       │ Slow path (AI Agent)
       ▼                 ▼
┌──────────────┐  ┌──────────────────────────────────┐
│ attendance   │  │ zaloAgent                       │
│ Service      │  │ 1. Gemini chọn tool             │
│ (checkin/    │  │ 2. Execute tool (openzca/MongoDB│
│  checkout)   │  │ 3. Loop (max 5)                 │
└──────┬───────┘  └──────┬───────────────────────────┘
       │                  │
       └────────┬─────────┘
                ▼
      openzca msg send → Phản hồi Zalo
```

### Các thành phần chính

| Thành phần | Mô tả |
|---|---|
| **openzca CLI** | CLI tool mã nguồn mở (MIT), miễn phí 100%, lắng nghe realtime và gửi/nhận tin nhắn Zalo |
| **Express Server** | Nhận webhook, routing intent, chạy trên port 3000 |
| **Intent Detector** | Regex phân loại fast path vs slow path |
| **attendanceService** | Xử lý checkin/checkout, ghi MongoDB |
| **zaloAgent** | AI Agent loop dùng Gemini tool-calling |
| **MongoDB Atlas** | Lưu trữ dữ liệu nhân viên và bản ghi chấm công |

---

## 5. Quy trình xử lý (Workflow / Sequence)

**Bước 1 — Nhân viên gửi tin nhắn**
Nhân viên mở Zalo, nhắn `checkin`, `checkout`, hoặc câu hỏi khác.

**Bước 2 — openzca nhận tin nhắn**
openzca CLI đang chạy `listen --webhook`, nhận tin nhắn realtime và gửi POST request đến Express server (`http://localhost:3000/hook`).

**Bước 3 — Intent Detection**
Webhook parse payload, gọi `intentDetector(content)`:
- Nếu match regex `checkin|điểm danh|start|in` → Fast path
- Nếu match regex `checkout|out|off|kết thúc` → Fast path (checkout)
- Không match → Slow path (AI Agent)

**Bước 4a — Fast path (checkin/checkout)**
```
attendanceService.checkin() / checkout()
  → Tạo hoặc cập nhật bản ghi trong MongoDB
  → Trả lời ngay qua Zalo (VD: "Đã checkin lúc 08:00")
```

**Bước 4b — Slow path (AI Agent)**
```
zaloAgent.runAgent(message, sender)
  1. Gửi message + tools definitions + system prompt → Gemini
  2. Gemini chọn tool phù hợp (VD: send_message, search_users, query_today_checkins...)
  3. Execute tool (openzca CLI / MongoDB)
  4. Append kết quả vào conversation
  5. Lặp lại (max 5 vòng)
  6. Trả final text → reply Zalo
```

**Bước 5 — Phản hồi Zalo**
`openzca msg send` gửi tin nhắn phản hồi đến nhân viên qua Zalo.

---

## 6. Công nghệ sử dụng (Tech Stack)

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| **Runtime** | Node.js 22+ (ESM) | Yêu cầu openzca |
| **Server** | Express.js | Webhook endpoint |
| **Database** | MongoDB Atlas | Free tier 512MB, cloud |
| **AI** | Google Gemini API | `@google/genai` SDK |
| **Zalo Transport** | openzca CLI | Mã nguồn mở, MIT, miễn phí |
| **Config** | dotenv | ENV loader |

### openzca — Tính năng chính

| Tính năng | Mô tả |
|---|---|
| Gửi / nhận tin nhắn | Realtime qua Zalo account đã login |
| Quản lý nhóm & bạn bè | Tạo group, thêm thành viên, rename, leave |
| Lắng nghe sự kiện realtime | Webhook / socket để nhận tin nhắn liên tục |

> **Lưu ý:** openzca không phải API chính thức của Zalo (unofficial), là tool mã nguồn mở miễn phí 100%.

---

## 7. Đánh giá phương án (Evaluation)

### Ưu điểm

- **Không cần cài app:** Người Việt Nam hầu như đều dùng Zalo — nhân viên chỉ cần nhắn tin, không cần cài thêm ứng dụng
- **Triển khai nhanh:** Chỉ cần máy local + Zalo account + openzca login
- **Giảm chi phí thiết bị:** Không cần máy vân tay, máy quét mặt
- **Giảm thời gian quản lý nhân sự:** Tự động ghi nhận, tổng hợp số liệu
- **Fast path tối ưu chi phí:** Checkin/checkout không qua AI → tiết kiệm API call
- **Mở rộng linh hoạt:** Dễ dàng thêm tool mới cho AI Agent (gửi tin nhắn, tạo group, tìm user...)
- **Chi phí vận hành thấp:** MongoDB Atlas free tier + Gemini free tier

### Nhược điểm

- **Phụ thuộc openzca CLI:** Tool bên thứ ba, có thể bị lỗi hoặc thay đổi
- **Cần máy local luôn bật:** Nếu máy tắt, nhân viên không chấm công được
- **MongoDB free tier giới hạn 512MB:** Phù hợp 20-200 nhân viên, cần nâng cấp nếu mở rộng
- **openzca unofficial:** Không phải API chính thức Zalo — không có SLA đảm bảo

---

## 8. Rủi ro & giải pháp (Risks & Mitigation)

| Rủi ro kỹ thuật | Giải pháp |
|---|---|
| openzca thay đổi command/API | Hardcode command với retry logic, cập nhật khi có phiên bản mới |
| Gemini API rate limit | Exponential backoff, fast path giảm số lượng API call |
| MongoDB Atlas down | Reply "Hệ thống tạm bảo trì" cho nhân viên |
| openzca bị crash | Auto-restart sau 5s, tối đa 10 lần |
| Double checkin (spam) | Kiểm tra bản ghi hôm nay, cảnh báo nếu đã checkin |
| Máy local tắt / mất internet | Nhân viên không chấm công được → thông báo cho quản lý |

---

## 9. Chi phí & tài nguyên (Cost & Resources)

| Hạng mục | Chi phí |
|---|---|
| MongoDB Atlas | Miễn phí (free tier 512MB) |
| Gemini API | Miễn phí (free tier — đủ cho team 20-200 người) |
| openzca CLI | Miễn phí (MIT, mã nguồn mở) |
| Máy chủ / máy local | Chi phí máy hiện có |
| **Tổng chi phí vận hành** | **~0 đồng / tháng** |

| Tài nguyên | Yêu cầu |
|---|---|
| Nhân lực phát triển | 1 người |
| Máy chạy hệ thống | Windows/Mac có openzca đã login Zalo |
| Kết nối internet | Cần để gửi webhook + gọi Gemini API |

---

## 10. Kế hoạch triển khai (Implementation Plan)

### Các chức năng cơ bản đã triển khai

- ✅ Checkin / Checkout qua tin nhắn Zalo
- ✅ Xác nhận trạng thái và lưu vào MongoDB
- ✅ Tổng hợp số liệu theo ngày / tháng (AI Agent query tools)
- ✅ AI Agent trả lời câu hỏi (Gemini tool-calling loop)
- ✅ 20 tools cho AI Agent (messaging, group, friend, db, utility)
- ✅ Permission layer (employee / manager roles)

### Phase tiếp theo

| Phase | Nội dung | Trạng thái |
|---|---|---|
| Phase 1 | Tool Interface Layer (20 tools) | ✅ Hoàn thành |
| Phase 2 | Agent Core (Gemini tool-calling loop) | ✅ Hoàn thành |
| Phase 3 | Intent Detector v2 + Webhook routing | ✅ Hoàn thành |
| Phase 4 | Error handling + edge cases | ⬜ Chưa hoàn thành |
| Phase 5 | Polish & documentation | ⬜ Chưa hoàn thành |

### Demo hiện tại

Hệ thống core đã chạy end-to-end:
- ✅ `checkin` → fast path → MongoDB → reply Zalo
- ✅ `checkout` → fast path → MongoDB → reply Zalo
- ✅ Câu hỏi khác → AI Agent → Gemini tool-calling → reply Zalo
- ✅ 1-2 tools đã test thực tế (gửi tin nhắn, tạo group)

---

## 11. Kết luận & đề xuất (Conclusion & Recommendation)

### Có nên chọn phương án này không?

**Có — đặc biệt phù hợp với đối tượng khách hàng mục tiêu:**

Các doanh nghiệp sử dụng nhân viên thời vụ (làm việc ngắn hạn, ít hơn nhân viên chính thức) sẽ hưởng lợi lớn từ hệ thống này. Phương án này giải quyết trực tiếp các vấn đề của phương pháp truyền thống:

- Không cần mua/thiết lập thiết bị vân tay/mặt
- Nhân viên chỉ cần nhắn tin Zalo — ai cũng biết dùng
- Chi phí vận hành gần như bằng 0
- Triển khai nhanh trong vài giờ

### Áp dụng trong trường hợp nào?

- ✅ Team 20-200 nhân viên thời vụ
- ✅ Nhân viên có điện thoại thông minh dùng Zalo
- ✅ Cần giải pháp nhanh, chi phí thấp
- ⚠️ Không phù hợp nếu cần uptime 24/7 cao (phụ thuộc máy local)

### Khuyến nghị

1. **Ngắn hạn:** Hoàn thành Phase 4-5 để hệ thống production-ready (error handling, nhắc nhở tự động)
2. **Dài hạn:** Cân nhắc deploy lên cloud (VPS/server) thay vì máy local để đảm bảo uptime cao hơn
3. **Mở rộng:** Thêm tính năng tự động nhắc nhở checkin/checkout hàng ngày qua Zalo

---

*Lần cập nhật cuối: 2026-03-27*
