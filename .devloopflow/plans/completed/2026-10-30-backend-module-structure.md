# Backend module structure — Implementation Plan

> Trạng thái: Hoàn tất. Thực hiện trực tiếp trong phiên theo yêu cầu người dùng “sửa đi ... test lại”.

**Goal:** Chuẩn hóa auth/platform và quy ước module REST API, giữ nguyên hành vi.
**Architecture:** Module nghiệp vụ gọn; HTTP/entity/test đặt trong module; DataSource/migration tập trung. Không thêm tầng hoặc dependency.
**Tech Stack:** NestJS 11, TypeScript 5, TypeORM 0.3, PostgreSQL 17, node:test.
**Spec:** docs/architecture/2026-10-30-backend-module-structure-design.md — người dùng cho triển khai ngày 2026-10-30.

## Ràng buộc và phạm vi

- Không đổi URL, method, permission, validation, response, cookie, transaction, schema hoặc migration lịch sử.
- Nhánh refactor/backend-module-structure từ feat/pb03-platform sau fetch/pull --ff-only; không push/merge.
- Dùng task active làm ledger, giữ nguyên chứng cứ cũ; run mới ghi mã cuối dirty và output gốc.
- Graph đã tìm caller/entity, nhưng có symbol cũ (pageNumber); đối chiếu source/import bằng rg khi graph thiếu/cũ.

## Review focus

1. Entity thiếu/trùng/vòng import: đối chiếu metadata TypeORM trước/sau và test tích hợp PostgreSQL.
2. Import controller/filter/guard lỗi: build và test HTTP auth/platform/foundation.
3. Di chuyển helper lỗi đổi payload: giữ nguyên implementation, test lỗi HTTP hiện có.
4. Migration sai vị trí: giữ database/migrations và test apply/reapply hiện có.
5. JS cũ trong dist gây chạy trùng: liệt kê/xóa riêng file build mồ côi tương ứng source đã di chuyển, lưu danh sách; kiểm tra số test cuối.

## Các bước

- [x] 1. Lưu bảng tiêu chí → kiểm tra → artifact trước chạy; chạy build/test baseline, snapshot metadata và hash migration.
- [x] 2. Di chuyển platform controller/DTO vào http/, test vào tests/, Store vào platform/entities; chuyển 6 entity auth vào auth/entities; giữ Branch trong database/entities. Cập nhật mọi import trực tiếp, bỏ nội dung barrel tập hợp entity cũ (giữ export Branch).
- [x] 3. Di chuyển filter/health vào http/; trích helper httpError(status: number, code: string, message: string): HttpException sang http/http-error.ts. Dùng helper này cho auth/platform, cập nhật tất cả caller. Không thay logic.
- [x] 4. Cập nhật ARCHITECTURE.md mục 2 và 5.1, POS_API/README.md, trạng thái thiết kế. Giữ platform.pagination.ts tại gốc vì controller/service cùng dùng.
- [x] 5. Xử lý artifact build cũ do di chuyển theo từng file; chạy npm test (bao gồm build) trên PostgreSQL thử riêng; snapshot metadata cuối, đối chiếu baseline và hash migration. Lưu stdout/stderr, exit code, thời gian, SHA, dirty, manifest hash source và bảng tiêu chí → artifact.
- [x] 6. Review diff/import và kiểm tra đủ chứng cứ; sửa nếu cần rồi chạy lại kiểm tra bị ảnh hưởng; ghi kết quả và chuyển task/plan completed khi xong. Không coi local là CI độc lập.

## Kết quả

- Source và hướng dẫn chính tại ARCHITECTURE.md theo thiết kế đã duyệt; không đổi hợp đồng/schema/dependency.
- Baseline và final npm test đều exit 0: 7 pass, 0 fail, 0 skipped. Metadata 8 entity và hash 3 migration bằng nhau; 42 source file khớp manifest sau test.
- Reviewer riêng không tìm thấy regression và đã xác nhận bảng MOD-01…07 đủ artifact. Chi tiết: qa-evidence/2026-10-30-103643-4db3149-module-structure/run.md.
- Đã xử lý hai lỗi của script thu bằng chứng; giữ chứng cứ lỗi gốc và đối chiếu lại thành công, không sửa log test.
- Giữ nhánh refactor/backend-module-structure, chưa commit/push/merge; chưa CI cho diff này. Không chạy UI/browser vì không thay UI.

## Kiểm tra

Lệnh chuẩn: npm run build; npm test tại POS_API với DATABASE_URL của PostgreSQL local và secret test riêng. Metadata kiểm tra bằng DataSource.buildMetadatas, xuất bảng/cột/relation/constraint từ đăng ký entity, so sánh trước/sau. Không chạy browser vì không thay UI. Bộ test tích hợp tạo/xóa DB thử riêng theo mã hiện có, không migration DB vận hành.
