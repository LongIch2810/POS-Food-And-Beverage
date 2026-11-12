# PB-01 — Nền API và PostgreSQL local

**Trạng thái:** completed — triển khai, kiểm tra và review kỹ thuật đã xong; Product Owner đã nghiệm thu PB-01 ngày 2026-10-28.

## Mục tiêu và phạm vi

Tạo nền NestJS/TypeScript, TypeORM và PostgreSQL local cho lát cắt đầu tiên của Sprint 1. PB-01 hoàn thành khi migration chạy được từ DB trống, API kiểm tra kết nối DB và hệ thống tạo đúng một tài khoản `PLATFORM_ADMIN` ban đầu. Login, quản lý phiên và nối UI thuộc PB-02/PB-13; cấu hình production thuộc PB-14.

Nguồn: `sprints/sprint-01/SPRINT.md`, `docs/PRODUCT_BACKLOG.md`, `docs/architecture/ARCHITECTURE.md`, `docs/architecture/auth.md`, `docs/DESIGN_DB_POS_SYSTEM.md`, `docs/api-spec.md`.

## Các bước

1. Chốt đặc tả PB-01 trong `specs/` trước khi viết mã: cách chạy local, migration, bootstrap, hợp đồng health check và các trường hợp lỗi. Bổ sung quy ước HTTP `503` vào `docs/api-spec.md` cho dịch vụ chưa sẵn sàng.
2. Tạo ứng dụng NestJS trong `POS_API/` và Docker Compose chỉ cho PostgreSQL local trong `POS_INFRA/`. Lấy cấu hình DB và bootstrap từ biến môi trường, không commit secret. Cung cấp lệnh migration riêng; API không tự chạy migration và không dùng schema sync.
3. Viết migration đầu cho `stores`, `branches`, `roles`, `permissions`, `role_permissions`, `users`, `refresh_tokens` với khóa ngoại và ràng buộc theo thiết kế DB. Đặc biệt có `UNIQUE (username)`, `CHECK (username = lower(btrim(username)))`, `UNIQUE (token_hash)` và partial unique index trên `refresh_tokens(session_id)` khi `revoked_at IS NULL`.
4. Sau migration, khi API khởi động và chưa có `PLATFORM_ADMIN`, đọc username, họ tên và mật khẩu từ biến môi trường; kiểm tra hợp lệ, băm mật khẩu và tạo tài khoản với `store_id`/`branch_id` rỗng, `must_change_password = true`. Thiếu hoặc sai biến thì dừng khởi động và không ghi giá trị vào log. Khi quản trị đã tồn tại, bỏ qua biến bootstrap và không sửa tài khoản.
5. Thêm `GET /api/v1/health` truy vấn DB thực: trả `200` trong envelope `data` khi sẵn sàng; trả `503` với mã lỗi ổn định khi DB không kết nối được. Không tiết lộ thông tin kết nối trong response.
6. Chạy kiểm tra trên PostgreSQL thật, lưu bằng chứng vào `qa-evidence/`, cập nhật task và đưa thay đổi ra review trước khi merge. Không tự push hoặc merge.

## Tiêu chí hoàn thành triển khai

Hợp đồng nghiệm thu chi tiết của PB-01 nằm trong `specs/foundation.md`; các ô chấp nhận của Product Owner nằm trong `sprints/sprint-01/SPRINT.md`.

- Từ DB local trống, migration chạy thành công; chạy lại không tạo cấu trúc hoặc dữ liệu trùng. API khởi động sau migration và health check phản ánh đúng tình trạng DB.
- DB từ chối username chưa chuẩn hóa hoặc trùng khác hoa/thường, và từ chối hai refresh token chưa thu hồi cùng `session_id`. Mật khẩu và refresh token chỉ có dạng hash trong DB.
- Bootstrap hợp lệ tạo đúng một `PLATFORM_ADMIN`; thiếu/sai biến ở lần đầu làm API dừng; lần khởi động sau không cần biến và không sửa tài khoản cũ. Không có tài khoản hoặc secret mặc định trong source/log.
- Build và test của API đạt trên DB thật; lệnh, log, trạng thái working tree, commit và kết quả được ghi vào `qa-evidence/` theo `AGENTS.md`. PB-01 chỉ được đánh dấu nghiệm thu sau review và xác nhận của Product Owner.

## Quyết định và rủi ro

- Product Owner đã chọn Docker Compose cho DB local, dừng khởi động nếu bootstrap thiếu/sai ở lần đầu, bỏ qua biến bootstrap khi quản trị đã tồn tại, và trả `503` khi health check mất kết nối DB.
- Working tree có thay đổi chưa commit trên nhánh `feat/sprint-1-auth`; các thay đổi có sẵn được giữ nguyên.

## Kết quả

- Đã hoàn thành các bước 1–6: spec, nền NestJS/PostgreSQL local, migration, bootstrap, health check và review. Các finding của code-reviewer và QA đã được sửa; lượt review cuối không còn finding.
- Kiểm tra local trên PostgreSQL thật: migration, test tích hợp, health HTTP `200`/`503` và audit dependency. Bằng chứng: `qa-evidence/20261028-125139-842ba1e/run.md` và `qa-evidence/20261028-131159-842ba1e/run.md`.
- Chưa có CI/runner độc lập. Product Owner đã nghiệm thu PB-01 trong `sprints/sprint-01/SPRINT.md` dựa trên kết quả và bằng chứng QA local.
