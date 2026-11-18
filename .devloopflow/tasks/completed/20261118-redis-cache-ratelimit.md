---
id: 20261118-redis-cache-ratelimit
spec: Bỏ qua spec: user nói "chưa cần lên kế hoạch và làm luôn" (2026-11-18)
plan: Bỏ qua plan: cùng lý do; thiết kế ở docs/architecture/ARCHITECTURE.md mục 10.1
status: completed
mode: đầy đủ
owner:
started_at: 2026-11-18
completed_at: 2026-11-18
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Task 20261118-redis-cache-ratelimit

## Trạng thái
- Bước hiện tại (số bước trong flow): 10 (đóng task theo lời user 2026-11-18; bỏ qua spec, plan, review-code, verify-ac, sync-docs, reflect)
- Đã xong: Bước 1 (khám phá do agent chính tự làm, không giao subagent explorer). Docs/rules thiết kế: `docs/architecture/ARCHITECTURE.md` mục 10.1, `rules/database.md` mục "Cache dữ liệu", ghi chú ở `docs/architecture/auth.md` mục 6 và `docs/architecture/TECH_STACK.md`. Code tự viết (RedisService, decorator, migration DropAuthRateEvents) đã hoàn tác theo duyệt của user; nhánh `feat/redis-cache-ratelimit` không còn thay đổi code.
- Đang làm: Đã triển khai bằng `@nestjs/cache-manager` (cache-aside, `POS_API/src/redis/store-cache.ts`, `cache.decorators.ts`) và `@nestjs/throttler` (cửa sổ cố định, `auth-throttler.guard.ts`, cấu hình ở `auth.module.ts`); migration `DropAuthRateEvents`; Redis trong compose và CI. `npm test` API local 358/358 pass (exit 0), `npm run build` exit 0. Chưa commit, chưa chạy CI.
- Sắp làm (khi user cho làm lại): dùng `@nestjs/cache-manager` (cache-aside) và `@nestjs/throttler` (cửa sổ cố định, không sliding window) với Redis; chốt mục "Còn mở" trong ARCHITECTURE.md 10.1 (limit/ttl login khi đếm mọi request; cách xóa cache theo nhóm); thêm Redis vào `POS_INFRA/compose.local.yml`, `.github/workflows/ci.yml`, env mẫu; spec, plan, TDD.

### Yêu cầu nguyên văn của user
- "Bây giờ t muốn dùng redis để caching để tăng hiệu suất cho ứng dụng trong giai đoạn 2 và dùng ratelimit với redis ko dùng trong DB nữa"
- Quyết định đã có (AskUserQuestion): Redis lỗi → fail-open; cache cho "Menu theo store" và "Cấu hình store/branch"; thêm Redis vào Docker Compose local và CI ("Có, cả hai").

### Kết quả khám phá (path nguồn)
- Rate limit hiện nay: `POS_API/src/auth/auth.service.ts:74-108` (`rateKey`, `checkRate`, `recordRate`, `recordRefreshAttempt`) và `:110-141` (`login`, kiểm giới hạn + khóa advisory trong cùng transaction với đăng nhập). Bảng `auth_rate_events`: `POS_API/src/auth/entities/auth-rate-event.entity.ts`, migration `POS_API/src/database/migrations/20261028000001-AuthRateEvents.ts`, đăng ký ở `POS_API/src/database/data-source.ts:3,49`. Caller refresh: `POS_API/src/auth/http/auth.controller.ts:85` (`request.socket.remoteAddress`).
- Test đụng `auth_rate_events`: `POS_API/src/auth/tests/auth.integration.test.ts:165,423,436,691`; `POS_API/src/organization/tests/organization.acceptance.test.ts:164`; `POS_API/src/organization/tests/organization.migration.test.ts:8,16`.
- Tài liệu nói rate limit lưu PostgreSQL: `docs/architecture/auth.md:61`; `docs/architecture/auth.md:25` cấm cache làm chậm hiệu lực thu hồi phiên/khóa user/store/đổi role; `docs/architecture/ARCHITECTURE.md:44,184`; `docs/architecture/TECH_STACK.md:39`; `docs/PRODUCT_OVERVIEW.md:210`.
- Menu: `POS_API/src/menu/menu.service.ts` (770 dòng; list/get/create/patch/delete category, size, product, topping, product-size, category-topping, ảnh). Organization: `POS_API/src/organization/organization.service.ts` (branch, table).
- Hạ tầng: `POS_INFRA/compose.local.yml` (postgres, api, ui; chưa có redis), `.github/workflows/ci.yml` (service postgres:17-alpine job backend), `POS_API/.env.example`, `POS_INFRA/.env.example`; chưa có dependency Redis trong `POS_API/package.json`.

## File đã thay đổi
| Path | Thay đổi gì | Sub-task |
|------|-------------|----------|
| `POS_API/src/redis/` (`store-cache.ts`, `cache.decorators.ts`, `redis.module.ts`, `auth-throttler.guard.ts`, `throttler-storage.ts`, `tests/`) | Cache-aside và throttle bằng Redis | - |
| `POS_API/src/auth/auth.service.ts`, `auth.module.ts`, `http/auth.controller.ts`, `auth-config.ts` | Bỏ rate limit PostgreSQL; throttler theo route; `REDIS_URL` bắt buộc | - |
| `POS_API/src/menu/menu.service.ts`, `organization/organization.service.ts` | `@Cached` / `@Invalidates` | - |
| `POS_API/src/database/` (entity `AuthRateEvent` xóa, migration `20261118000000-DropAuthRateEvents.ts`, `data-source.ts`) | Bỏ bảng `auth_rate_events` | - |
| `POS_API/package.json`, `package-lock.json`, `test-setup/flush-redis.mjs`, `.env.example` | Dependency, preload test, biến môi trường | - |
| `POS_INFRA/compose.local.yml`, `.github/workflows/ci.yml` | Service Redis | - |
| Tests: `auth.integration.test.ts`, `auth-config.test.ts`, `organization.acceptance.test.ts`, `foundation.test.ts`, `entity-schema.integration.test.ts`, `redis/tests/` | Cập nhật theo throttle/cache; test mới RD-1, RD-2 | - |
| `docs/architecture/ARCHITECTURE.md`, `TECH_STACK.md`, `auth.md`, `rules/database.md`, `.devloopflow/specs/auth.md`, `.devloopflow/devloopflow.md` | Tài liệu cache, throttle, Redis | - |

## Đã đọc errors
- Chưa tới bước 6.

## Lịch sử review (chỉ thêm, không xoá)
- Không có code review (user bỏ qua quy trình đầy đủ).

## Lịch sử kiểm AC (chỉ thêm, không xoá)
- Không có verify-ac. Bằng chứng duy nhất: `npm test` API local 358/358 pass, exit 0, `npm run build` exit 0 (2026-11-18, local do agent chạy; chưa có CI).

## Cập nhật tài liệu (sync-docs, bước 10b; chỉ thêm, không xoá)
- Tài liệu đã sửa cùng thay đổi (xem bảng file); không chạy sync-docs riêng.

## Kinh nghiệm đã ghi (reflect, bước 10c; chỉ thêm, không xoá)
- Không có bài học mới được ghi: user yêu cầu đóng task, không chạy reflect.

## Blocked
- Lý do: Không có
- Lỗi còn lại: Không có
- Đề xuất: Không có
