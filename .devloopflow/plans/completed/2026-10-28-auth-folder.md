# Trạng thái: completed — refactor cấu trúc đã kiểm tra, PB-02 chờ Product Owner nghiệm thu Sprint

## Mục tiêu

Gom toàn bộ mã và test PB-02 vào `POS_API/src/auth/` dưới một NestJS `AuthModule`, giữ API HTTP và hành vi cũ.

## Phạm vi và quyết định

- Chuyển chính xác 11 file auth hiện có; giữ `main.ts`, `app.module.ts`, `api-error.filter.ts`, `swagger-docs.ts`, `health.controller.ts`, `data-source.ts` và migration ở cấp hiện tại.
- AuthModule sở hữu controller, guard, strategy, service; DatabaseModule chia sẻ một DataSource cho auth và health.
- Cập nhật import, script tìm test lồng thư mục, đường dẫn tham chiếu trong docs/error ledger.

## Các bước

1. Kiểm tra Git status, file nguồn và đích; chuyển từng file, không ghi đè.
2. Thêm AuthModule/DatabaseModule và sửa import/test script.
3. Build, test tích hợp PostgreSQL, kiểm tra route/Swagger, ghi QA evidence và review diff.
4. Cập nhật task/plan và Sprint; không tự commit/push.

## Tiêu chí hoàn thành

Không còn file PB-02 rải ở root `src/`; toàn bộ test cũ chạy và được phát hiện; không đổi response/route/database; build và test đạt.

## Rủi ro

Node test glob phải bắt file trong `dist/auth/`; Nest DI cần chia sẻ đúng DataSource override trong test tích hợp.

## Kết quả

- Đã chuyển 11 file PB-02 vào `src/auth/`, tạo `AuthModule`; `DatabaseModule` cấp một DataSource cho auth và health. Các file app-wide và migration giữ đúng chỗ.
- Import, script test, README, đường dẫn error ledger và Sprint đã cập nhật. Dọn đúng 11 file JS build cũ ở `dist/` sau khi chuyển.
- QA local `qa-evidence/20261028-154329-cdcc096/run.md`: `npm test` 5/5 đạt, 0 fail trên PostgreSQL. `git diff --check` đạt. Không đổi route/response/schema DB.
