**Trạng thái:** completed

# Sửa ba finding PB-02

Mục tiêu: đồng bộ chuẩn hóa username với PB-01, logout idempotent với phiên đã chết và từ chối body không khai báo.

Phạm vi: auth DTO/service/controller, bootstrap admin, test liên quan; không đổi schema/API.

Các bước: thêm test tái hiện; sửa từng nguyên nhân; chạy build/test PostgreSQL; ghi QA evidence; review diff.

Hoàn thành khi ba hồi quy có test và backend build/test đạt. Rủi ro: chuẩn hóa PostgreSQL cần DB thật; logout phải giữ CSRF cho session còn sống.

Quyết định: `lower(btrim(username))` là chuẩn theo spec và constraint PB-01. Không thêm dependency.

Kết quả: đã sửa cả ba finding và thêm test hồi quy; `npm test` đạt 5/5 trên PostgreSQL 17 tạm, xem `qa-evidence/2026-10-29-091545-fc2b07d/run.md`. Chưa có xác nhận CI độc lập; chưa merge/push.
