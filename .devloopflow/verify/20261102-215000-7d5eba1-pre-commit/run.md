# Bằng chứng kiểm thử Pre-Commit - Sprint 05 (PB-06 & PB-13)

- **Thời điểm**: 2026-11-02 21:50:00 - 21:54:00 (UTC+7)
- **Commit SHA**: `7d5eba1`
- **Working Tree**: dirty (feat/pb06-shifts - ready for commit)
- **Môi trường**: 
  - Node.js v22.18.0
  - PostgreSQL 17 Docker container `pos_infra-postgres-1` (port 5432)
  - Backend NestJS Docker container `pos_api` (port 3000)
  - Frontend Vite Docker container `pos_ui` (port 5173)
- **Người thực hiện**: Local Antigravity Agent

---

## 1. Kết quả kiểm thử Backend (`npm --prefix POS_API test`)

- **Lệnh**: `npm --prefix POS_API test`
  - Thực thi: `npm run build && node --env-file-if-exists=.env --test --test-concurrency=1 "dist/**/*.test.js"`
- **Exit code**: `0`
- **Thời gian**: ~159 giây
- **Số lượng test**:
  - Suites: 15 / 15 pass
  - Subtests: 65 / 65 pass (0 fail, 0 skipped, 0 cancelled)
- **Bao gồm các test suite chính**:
  1. `PB-02 startup rejects absent or weak authentication configuration`
  2. `PB-02 login creates a hashed refresh session and cookie-only tokens`
  3. `PB-02 login rejects a missing Origin before reading credentials`
  4. `PB-02 Swagger schemas are available only in development`
  5. `PB-01 migration, bootstrap and database constraints`
  6. `PB-05 menu and catalog HTTP with PostgreSQL` (7 subtests)
  7. `PB-04 acceptance evidence AUD-01..05 with PostgreSQL and captured app logs` (8 subtests)
  8. `ORG-PAGE cursor preserves microseconds and binds filters, resource and tenant`
  9. `DOC-02 AUD-05 per-endpoint errors and executable DTO examples match approved contract`
  10. `PB-03 store, OWNER, suspension, reset and access boundaries`
  11. `PB-03 cursor preserves microseconds and validates list scope and query`
  12. `PB-06 shifts and cash reconciliation HTTP with PostgreSQL` (8 subtests)

---

## 2. Kết quả kiểm thử Frontend (`npm --prefix POS_UI test`)

- **Lệnh**: `npm --prefix POS_UI test`
  - Thực thi: `node --experimental-strip-types --test test/*.test.mjs`
- **Exit code**: `0`
- **Thời gian**: 1.66 giây
- **Số lượng test**: 32 / 32 pass (0 fail, 0 skipped, 0 cancelled)
- **Bao gồm các bài test shifts**:
  - `PB13-SHIFT-HTTP operations preserve endpoints, query params, bodies and CSRF tokens` (test đầy đủ GET /work-shifts/current, GET /work-shifts/opening-cash-info, POST /work-shifts, POST /work-shifts/:id/close, POST /work-shifts/:id/force-close, GET /work-shifts).

---

## 3. Kiểm tra Build Production

### Backend Build
- **Lệnh**: `npm --prefix POS_API run build`
- **Exit code**: `0`
- **Output**: TypeScript `tsc -p tsconfig.json` compile thành công không có lỗi type nào.

### Frontend Build
- **Lệnh**: `npm --prefix POS_UI run build`
- **Exit code**: `0`
- **Output**:
  ```
  dist/index.html                   0.93 kB │ gzip:   0.52 kB
  dist/assets/index-CRPmQODd.css    5.09 kB │ gzip:   1.77 kB
  dist/assets/index-hoj6CHnD.js   429.23 kB │ gzip: 110.24 kB
  ✓ built in 2.18s
  ```

---

## 4. Kiểm thử E2E Thực tế trên Docker (`test-e2e-docker-shifts.mjs`)

- **Lệnh**: `node qa-evidence/20261102-212200-7d5eba1-pb06-shifts/test-e2e-docker-shifts.mjs`
- **Môi trường**: Docker Compose thực tế (`pos_infra-postgres-1`, `pos_api:3000`, `pos_ui:5173`)
- **Exit code**: `0`
- **Các bước xác minh (12/12 pass)**:
  1. `Login Admin` -> OK
  2. `Create Store with Owner` -> OK
  3. `Login Owner & Change Password` -> OK
  4. `Create Branch with initialCash = 1,500,000 VND` -> OK
  5. `Create Manager & Cashier users` -> OK
  6. `Manager setup and STAFF Shift Check-in/Check-out` -> OK
  7. `Cashier setup and Cashier Shift Operations (Opening cash = 1,500,000)` -> OK
  8. `Verify initialCash lock on branch (BR-55)` -> OK (409 INITIAL_CASH_LOCKED)
  9. `Cashier closes shift 1 with blind count` -> OK (status MATCHED)
  10. `Cashier opens shift 2 (inherits previous counted cash 1,500,000)` -> OK
  11. `Manager forces close shift 2 with shortage (-50,000)` -> OK (status SHORTAGE, closed_by ghi nhận manager audit)
  12. `Query work shifts list pagination` -> OK (3 shifts returned with metadata)

---

## 5. Kết luận
Tất cả các bài kiểm tra Backend, Frontend, Build và Docker E2E đều đạt 100% (Green). Codebase sẵn sàng để stage và commit.

