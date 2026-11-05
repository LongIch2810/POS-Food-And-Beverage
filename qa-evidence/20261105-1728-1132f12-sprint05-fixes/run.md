# Sprint 05 review fixes — lượt đầu

- Nhãn: **local do agent chạy**. Commit nền `1132f12`, working tree dirty; Windows PowerShell, Node v22.22.2.
- `POS_API`: `npm run build` exit 0, khoảng `17:28:28` ngày `2026-11-05` (+07); [backend-build.log](backend-build.log). Build lặp sau chỉnh test exit 0 khoảng `17:30:49`; [backend-rebuild.log](backend-rebuild.log).
- `POS_UI`: `npm run build` exit 0, khoảng `17:28:28–17:28:54`; [frontend-build.log](frontend-build.log). `npm test` exit 0, 33/33 test, khoảng `17:30:49–17:30:53`; [frontend-test.log](frontend-test.log). Các lượt này trước thay đổi UI/test cuối, được thay bởi [lượt cuối](../20261105-1745-1132f12-sprint05-fixes-final/run.md).
- Test tích hợp ca tại `POS_API`: exit 1, khoảng `17:30:56–17:32:01`; [backend-shifts-test.log](backend-shifts-test.log) ghi `ECONNREFUSED 127.0.0.1:5432`, PostgreSQL chưa chạy. Lệnh chính xác và thời điểm bắt đầu chưa được lưu lúc chạy; kết quả này không dùng để kết luận mã lỗi.
- Chạy `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --wait postgres` tại gốc repo khoảng `17:32:28–17:32:36`; lệnh trả exit 1 do PowerShell diễn giải stderr tiến độ của Docker. [postgres-start.log](postgres-start.log). `docker compose ps` sau đó xác nhận container PostgreSQL healthy. Test thành công sau khi DB bật được lưu ở [lượt cuối](../20261105-1745-1132f12-sprint05-fixes-final/run.md).

Các khoảng thời gian không có metadata riêng dựa trên timestamp file log, không được xem là timestamp chính xác của toàn lệnh.
