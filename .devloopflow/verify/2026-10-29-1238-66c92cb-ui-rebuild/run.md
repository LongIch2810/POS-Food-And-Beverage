# Kiểm tra UI container sau khi sửa lỗi proxy

- Loại: local do agent chạy; kiểm tra thủ công bằng Chrome DevTools MCP.
- Thời gian: 2026-10-29 12:37–12:38 +07:00.
- Commit: `66c92cb`; working tree dirty (33 mục trước khi ghi bằng chứng này).
- Môi trường: Windows, Docker Compose project `pos_infra`, `pos_ui` tại `http://localhost:5173`, `pos_api` và PostgreSQL local đang chạy.
- Lệnh build: `docker compose -p pos_infra --env-file 'D:/saved/Project/POS-F&B/POS_INFRA/.env.local' -f POS_INFRA/compose.local.yml up -d --build --no-deps ui` (exit 0; image built, container recreated).
- Lệnh kiểm tra: `docker ps --filter 'name=pos_ui' --filter 'name=pos_api' --format '{{.Names}} {{.Status}}'`; `docker exec pos_ui sh -lc "grep -n 'Có lỗi xảy ra. Vui lòng thử lại.' /app/src/auth/client.ts"`; `Invoke-WebRequest` đến `/` và `/api/v1/health` qua cổng 5173 (đều exit 0).
- Output: [docker-ps.txt](evidence/docker-ps.txt), [container-source.txt](evidence/container-source.txt), [http.txt](evidence/http.txt).
- UI-01: Mở `http://localhost:5173/` trong Chrome DevTools MCP, isolated context `pb13-live-recheck`, page ID 3. Mong đợi: trang đăng nhập demo hiện đúng; thực tế: snapshot có logo, tiêu đề POS, biểu mẫu tên đăng nhập/mật khẩu và nút “Đăng nhập hệ thống”. Không đăng nhập bằng thông tin nhạy cảm trong lần kiểm tra này.
- Lỗi 500 body rỗng đã được tái hiện và xác nhận trong Chrome DevTools MCP trước khi rebuild; xem [lần kiểm tra trước](../2026-10-29-auth-proxy-fix-local/run.md). Lần này xác nhận mã sửa đã vào container và luồng UI/API đang phục vụ.
