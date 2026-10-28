# AGENT EXECUTION INSTRUCTIONS: 10_OmniTerm

## Project Goal
Xây dựng và hoàn thiện **OmniTerm** — Ứng dụng quản trị kết nối đa giao thức (SSH, SFTP, Telnet, Local Terminal) tương đương trải nghiệm của MobaXterm Professional, hỗ trợ 2 hình thức phân phối song song:
1. **Web Bastion / Gateway (Docker Compose)**: Đóng gói hoàn chỉnh để có thể chạy trên bất kỳ VPS nào chỉ bằng lệnh `docker compose up -d`. Giữ nguyên 100% giao diện React UI/UX đã thiết kế.
2. **Desktop App (Tauri v2)**: Build ra ứng dụng native chạy độc lập trên Windows (`.exe`/`.msi`) và Linux (`.AppImage`/`.deb`).

---

## Architecture Guidelines

### 1. Web Version & Docker Packaging (Bản Web chạy VPS)
- **Frontend**: React 18 + Vite + TailwindCSS + `@xterm/xterm` (xterm.js). Đã có sẵn tại `src/`.
- **Backend / Gateway**: Node.js WebSocket SSH Gateway (sử dụng thư viện `ssh2` và `ws`) cho phép terminal xterm.js trên trình duyệt kết nối trực tiếp đến các host SSH thật, đồng thời hỗ trợ SFTP file stream.
- **Docker Compose**:
  - Viết `docker-compose.yml` tại thư mục gốc `omniterm/`.
  - Service `omniterm-web`: Nginx hoặc Node server phục vụ build tĩnh `dist/` và proxy WebSocket `/ws/ssh` & REST APIs `/api/` về backend gateway.
  - Port mặc định: `3200` (tránh xung đột với 3100 của Hub hay 8080 của SCOP).
  - Volume lưu trữ persistent data: `/data/sessions.sqlite`.
  - Khởi động nhẹ nhàng, không yêu cầu cấu hình OIDC phức tạp khi tự host trên VPS cá nhân.

### 2. Dual SFTP Browser (Trải nghiệm MobaXterm)
- Bên cạnh cửa sổ Terminal xterm.js, cung cấp bảng điều khiển file SFTP (Sidebar hoặc split view):
  - Cây thư mục remote host.
  - Thao tác: Duyệt file, tải xuống, tải lên (drag & drop), tạo thư mục, đổi tên, xóa file.
  - Kết nối tự động thông qua cùng credential SSH của tab hiện tại.

### 3. Desktop Native App (Tauri v2)
- Thư mục `src-tauri` đã được cấu hình với Rust.
- Tận dụng cùng một mã nguồn frontend React `src/` để build desktop app.
- Cấu hình file `src-tauri/tauri.conf.json` để cho phép build trên cả Windows (`bundle/msi`, `bundle/nsis`) và Linux (`bundle/appimage`, `bundle/deb`).

### 4. Non-Negotiable Rules
- **KHÔNG làm hỏng giao diện**: Giữ nguyên toàn bộ layout, Dark mode, tabs, icons Lucide và các component trong `src/components/`.
- **Đảm bảo tính độc lập**: Bản web đóng gói Docker phải chạy được "ngay lập tức" trên mọi VPS Linux mà không bắt buộc setup OIDC từ bên ngoài. Hỗ trợ Local Auth / Simple Master Password hoặc direct SSH connect.
- **Kiểm thử đầy đủ**: Sau khi viết code, bắt buộc chạy `npm run build` để xác nhận không lỗi TypeScript, và kiểm thử build Docker image thành công.
