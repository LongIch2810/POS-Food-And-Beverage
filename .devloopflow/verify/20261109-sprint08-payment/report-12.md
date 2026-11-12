# Kiểm AC report 20261109-sprint08-payment — vòng 12

## Kết luận
FAIL

- Ngày: 2026-11-11. Chạy lẫn lộn nhiều phiên bị ngắt; log run chính bắt đầu 2026-11-11T04:28:06Z, test/build 03:55:26Z → 04:00:05Z (UTC).
- Plan đối chiếu: `.devloopflow/approved/20261109-sprint08-payment.md` (đối chiếu thêm plan active `.devloopflow/plans/active/20261109-sprint08-payment.md`)
- Spec đối chiếu: `.devloopflow/specs/20261109-sprint08-payment.md`, `.devloopflow/specs/20261109-sprint08-payment-api.md`
- Nhãn bằng chứng: **local do agent chạy**. Không phải CI/runner độc lập. Bằng chứng thô ở `.devloopflow/verify/20261109-sprint08-payment/evidence/` (bị `.gitignore` chặn), không đối chiếu được từ remote.
- HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf` (`evidence/r12-git-head.txt`); working tree dirty, thay đổi Sprint 08 chưa commit (`evidence/r12-git-status-before.txt`, `evidence/r12-git-diff-stat.txt`).

**Lý do FAIL:** (1) V1-4 BLOCKED: không có phiên dashboard SePay Test mode, 5 giao dịch provider chưa chạy lại trên mã cuối; (2) V11-1 NOT VERIFIED một phần: chưa có chuyển trạng thái UI cho xác nhận thủ công và auto-PAID do webhook; (3) V12-1 mới (errors/): một số finding đã sửa trong task không có file `errors/`, chờ user quyết. Không phát hiện sai hành vi sản phẩm trong các ca đã chạy.

### Giới hạn của report này (đọc trước khi dùng làm chứng cứ)
- Subagent `ac-verifier` bị ngắt nhiều lần (phiên kết thúc giữa chừng, Docker dừng) và **không ghi được** `report-12.md`/`fails.md` (công cụ Write từ chối ghi file từ subagent). Agent chính ghi hai file này từ báo cáo trả về của subagent, sau khi tự mở lại: `evidence/r12-api-test.stdout.txt`, `evidence/r12-ui-test.stdout.txt`, `evidence/r12-*.result.json`, `evidence/r12-live/assertions.jsonl` (đếm 70 dòng, đều `status: PASS`), danh sách `evidence/r12-ui-interrupted-run/` (12 file), `review/backlog.md` và `errors/`. Agent chính **chưa mở lại từng ảnh PNG, `http.jsonl`, `db.jsonl` hay `r12-ui-cash-network.json`**; các kết luận dựa trên các file đó là lời thuật của subagent, chưa được agent chính đọc lại.
- Subagent không ghi trích NGUYÊN VĂN tài liệu nguồn (path:dòng) cho từng AC. Cột "Quy định trong tài liệu" bên dưới vì vậy chỉ dẫn AC của plan; điều kiện "(b) khớp (c)" **chưa được xác minh trong vòng này** (các vòng 1–11 đã có đối chiếu tài liệu; vòng 12 không thay thế chúng). Kết luận ghi "Đúng theo (a)=(b)" nghĩa là chỉ so kết quả thật với plan.
- Phiên đầu của UI (CASH/zero/retry) bị ngắt; bằng chứng đã được subagent chuyển (không xóa) sang `evidence/r12-ui-interrupted-run/`. Phần UI còn lại chưa chạy.
- Không tạo `qa-evidence/<ts>-<sha>/run.md` vòng 12 (subagent chỉ được ghi trong `.devloopflow/verify/<id>/`). `AGENTS.md` yêu cầu `run.md` cho QA; chưa có.

## Tài liệu nguồn đã đối chiếu
Danh sách đã giao cho subagent (không xác nhận subagent đã mở đủ từng file trong vòng bị ngắt):
- `AGENTS.md`, `docs/PRODUCT_OVERVIEW.md`, `docs/BUSINESS_RULES.md`, `docs/DESIGN_DB_POS_SYSTEM.md`, `docs/api-spec.md`, `specs/invoices.md`, `specs/sales.md`, `specs/shifts.md`, `THIRD_PARTY_INTEGRATIONS.md`, `rules/testing.md`, `rules/security.md`, `rules/database.md`, `docs/architecture/auth.md`, `DESIGN.md`, `sprints/sprint-08/SPRINT.md`
- Subagent báo đã dùng: `specs/sales.md:17` (quyền `invoice.cancel_open`), `AGENTS.md:29`/`CLAUDE.md:29`, `THIRD_PARTY_INTEGRATIONS.md:3`, `docs/api-spec.md`, `specs/invoices.md` (mã lỗi mới). Agent chính chưa đối chiếu lại các dòng này.

## Môi trường
- Lệnh chạy app: `npm start` (POS_API) và Vite dev (POS_UI) bằng script `evidence/scripts/r12-gen.cjs` → `r12-live.cjs`, trên PostgreSQL sandbox. Không dùng `docker compose` mặc định (chưa xác nhận DB mặc định an toàn).
- Sandbox: container dùng một lần `pos_s8_r12_pg` (postgres:17, 127.0.0.1:15432) vì cổng 55432 bị Windows chặn bind sau khi Docker khởi động lại. DB chính `pos_s8_qa_r12_mwbmc1v0`; các DB `pos_s8_qa_r12_*` khác và container còn nguyên (không xóa theo quy định). API/UI/bridge do lượt này bật đã dừng (lời subagent; agent chính chưa kiểm process).
- Không dùng SePay Live, không tiền thật, không production. SePay cục bộ là HMAC ký tại chỗ, **không chứng minh provider Test mode**.

## Kết quả test
| Lệnh | Bắt đầu → kết thúc (UTC) | Exit | Output |
|---|---|---|---|
| `npm test` (POS_API) | 2026-11-11T03:55:26.203Z → 03:59:24.395Z | 0 | `evidence/r12-api-test.stdout.txt`: `# tests 150`, `# pass 150`, `# fail 0`, `# cancelled 0`, `# skipped 0` (agent chính đã đọc) |
| `npm test` (POS_UI) | 03:59:24.429Z → 03:59:29.085Z | 0 | `evidence/r12-ui-test.stdout.txt`: `# tests 65`, `# pass 65`, `# fail 0` (agent chính đã đọc) |
| `npm run build` (POS_API) | 03:59:29.111Z → 03:59:37.194Z | 0 | `evidence/r12-api-build.*` |
| `npm run build` (POS_UI) | 03:59:37.231Z → 03:59:59.060Z | 0 | `evidence/r12-ui-build.*` |
| `npm run typecheck` (POS_UI) | 03:59:59.092Z → 04:00:05.877Z | 0 | `evidence/r12-ui-typecheck.*` |
- Harness HTTP/SQL: `evidence/r12-live/{http.jsonl,db.jsonl,assertions.jsonl,environment-live.json}`, console `evidence/r12-live-console.log`. 70 assertion, 70 PASS (đếm bởi agent chính từ `assertions.jsonl`).
- Các run trước giữ nguyên: attempt1/2 lỗi harness (`$$` bị `String.replace` nuốt; manager không có quyền hủy đơn), attempt4 một kỳ vọng harness sai (đã sửa kỳ vọng, code đúng), attempt5 bị ngắt môi trường, attempt6 API không lên sau 25 giây chờ health (nguyên nhân gốc **chưa xác minh**; run kế tiếp cùng mã chạy bình thường).

## Coverage
- Lệnh: không có. `.devloopflow/devloopflow.md` mục 2 ghi không có script hay ngưỡng coverage; không tự đặt lệnh.

## Đã đối chiếu errors
- `.devloopflow/errors/INDEX.md` đã đọc. Ca exploratory (theo subagent, trong `evidence/r12-live/assertions.jsonl`, đều PASS): R1-1/R3-1 (X-R1-*), B-2 (X-B2-NOBRANCH), B-3 (X-B3-*), B-7 (X-B7), V1-1 (X-V1-1), V2-2 (X-V2-2), R7-3 (X-R7-3-*), B-19 (X-B19), V3-1 (X-V31-*), V3-2 (X-V32-*), B-4/R6-1 (X-R61-placeholder, X-R61-short31 → 503), R2-1 (R21-*), R14-1 (R14-*).
- Lỗi chỉ ở UI **chưa có ca browser vòng 12 → NOT VERIFIED**: R1-2, B-1, R5-1, R7-2, B-17, B-21, B-29.
- Kiểm `.devloopflow/errors/` theo finding đã sửa trong task (bước 10 của `ac-verifier.md`): **V12-1** (xem dưới).
- MEMORY: M-1 PASS; M-2 PASS (R12-BLANK, `referenceCode=' '` → ref `SEPAY:120007`, kind `SEPAY_EVENT`); M-3 NOT VERIFIED trên browser; M-4 PASS (theo subagent); M-5 Tài liệu không quy định (`AGENTS.md:29`, `THIRD_PARTY_INTEGRATIONS.md:3` vẫn ghi đã kiểm Test mode dựa vòng 10); M-7 áp dụng (thể hiện ở phần BLOCKED); M-8 PASS.

## Bảng đối chiếu (MỌI AC trong plan, không bỏ AC nào)
Ký hiệu `L/` = `evidence/r12-live/` (xem `assertions.jsonl`, `http.jsonl`, `db.jsonl`). Cột "Quy định trong tài liệu": chỉ dẫn AC của plan; trích nguyên văn path:dòng **chưa có** (xem Giới hạn). Kết luận dùng 4 giá trị chuẩn, kèm trạng thái chứng cứ.

| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật | Mong đợi theo plan | Quy định trong tài liệu | Kết luận | Ghi chú |
|---|---|---|---|---|---|---|---|
| ST-1.AC-1 | Test API + DB | `npm test` POS_API | 150/150 pass, `evidence/r12-api-test.stdout.txt` | MANAGER có `pos.sell`, ràng buộc unique chặn lặp (plan ST-1.AC-1) | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh vòng này | Agent chính chỉ đọc tổng số pass, chưa đối chiếu tên test với ma trận |
| ST-1.AC-2 | Test + HTTP | runner (SQLSTATE `23514`); `L/` R12-BANK19 → 200; R12-BANK20 → 422 `VALIDATION_ERROR` field `accountNumber` | `L/assertions.jsonl` (dòng đầu đã đọc) | 19 chữ số nhận, 20 bị chặn `23514`, cột `varchar(34)` | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | |
| ST-2.AC-1, E2E-AC-1 | HTTP | `L/` R12-PREVIEW: subtotal 60000, giảm 10000, total 50000, cảnh báo `NEGATIVE_STOCK`; R12-SCOPE-other/manager2/admin → 403/404; RF-4 | `L/assertions.jsonl` | preview 50.000đ, khác branch/store bị chặn | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | |
| ST-3.AC-1, E2E-AC-3 | HTTP + SQL | `L/` R12-ZERO, R12-ZERO-DB, R12-ZERO-REPLAY | 204, PAID, 0 payment, replay không đổi | 204/PAID/không payment/một SALE mỗi nguyên liệu | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | Rollback giữa transaction do test runner kiểm (API 150/150) |
| ST-4.AC-1, E2E-AC-2 | HTTP + SQL | `L/` R12-CASH, R12-CASH-REPLAY | 201, amount 50000, change 50000; replay header `true`, DB không đổi | 201, change 50.000đ, replay không đổi | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | |
| ST-5.AC-1, E2E-AC-5 | HTTP; UI reload/cancel | `L/` R12-PENDING-LOCK → 409; RF-2; X-V31-NOTPENDING | API đúng; reload/cancel trên UI chưa chạy | giữ mã A khi reload, hủy A tạo B khác mã, khóa sửa | chưa trích | Đúng theo (a)=(b) cho API; **UI chưa xác minh** | NOT VERIFIED phần UI |
| ST-5.AC-2 | như ST-1.AC-2 | | | PATCH 19 → 200, 20 → 422 | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | |
| ST-6.AC-1, E2E-AC-4 | HTTP HMAC cục bộ | `L/` R12-EXACT-*, R12-UNDER-*, R12-OVER-*, RF-1, RF-4, R12-BLANK | PASS | ≥ giá đơn → PAID; thiếu/muộn/promo invalid → OPEN + ngoại lệ; cùng id không đổi | chưa trích | Đúng theo (a)=(b) với HMAC cục bộ; **provider Test mode BLOCKED (V1-4)** | HMAC cục bộ không chứng minh nhận tiền tự động đầu cuối (plan rủi ro) |
| ST-7.AC-1, E2E-AC-6 | HTTP + SQL | `L/` RF-3, RF-3-WRONG, R12-MANUAL-DB (`confirmation_source=MANUAL`, giữ ca gốc), X-B7, R12-EXCEPTIONS-* | PASS | MANAGER/OWNER xác nhận hộ, khác branch bị chặn | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | |
| ST-8.AC-1 | Browser | `evidence/r12-ui-interrupted-run/r12-ui-cash-*`, `r12-ui-zero-*` (ảnh, network JSON) | CASH/zero/retry có ảnh và network; QR pending, reload, fallback, đổi session: chưa chạy | UI tablet: preview + cảnh báo; thành công chỉ sau 201/204; QR pending chỉ báo chờ; retry cùng key/body | chưa trích | **Chưa xác minh đủ**: phần CASH/zero/retry có chứng cứ (lời subagent, ảnh chưa được agent chính mở lại), các vế còn lại NOT VERIFIED | |
| ST-8.AC-2 | Browser | chưa chạy | runner UI 65/65 | OWNER nhập 19 lưu, 20 lỗi tại field, không gửi PATCH | chưa trích | **NOT VERIFIED** (chỉ có test runner) | |
| E2E-AC-7 | HTTP/SQL; UI | như ST-1/ST-5.AC-2 | API/DB PASS; UI không chạy | 19 lưu, 20 → 422, QR fallback hiện nguyên số | chưa trích | Đúng theo (a)=(b) cho API/DB; **UI NOT VERIFIED** | |
| R2-1.AC-1 | HTTP + SQL | `L/` R21-AC1: mở 100000 + CASH 50000 → expected 150000, counted 150000, difference 0, MATCHED; TRANSFER/0đ/đơn hủy không cộng | PASS | cash_sales 50.000, expected 150.000, MATCHED | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | |
| R2-1.AC-2 | HTTP + SQL | `L/` R21-AC2, R21-FORCE-SCOPE, R21-FORCE-CASHIER | force-close bởi OWNER expected 200000 MATCHED; manager khác branch và cashier bị chặn | cùng snapshot MATCHED, đúng quyền/scope | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | |
| R2-1.AC-3 | SQL trigger + HTTP | `L/` R21-ROLLBACK (trigger lỗi sandbox → 500, ca vẫn OPEN), R21-BLIND (expected/counted/difference null khi ca mở) | PASS | rollback, đếm mù | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | Race payment/close theo hai thứ tự khóa: không thấy dòng riêng trong báo cáo subagent — **chưa xác minh** |
| R14-1 (hồi quy) | HTTP + SQL | `L/` R14-OVER (422 "Số tiền vượt giới hạn cho phép."), R14-EXACT 201, R14-RACE [201,422], R14-CLOSE expected 1000000000000 MATCHED | PASS | theo `.devloopflow/errors/20261111-cash-reconciliation-exceeds-money-limit.md` | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | |
| RF-1, RF-2, RF-3, RF-4 | HTTP | assertion cùng tên | PASS | theo mục Review Focus của plan | chưa trích | Đúng theo (a)=(b); (c) chưa xác minh | |
| RF-5 | Browser | `r12-ui-interrupted-run/r12-ui-cash-network.json`: 2 POST cùng `Idempotency-Key`, cùng body; lần 2 → 201 `idempotent-replay=true`; UI "Thanh toán thành công." | theo subagent | retry cùng key/body, không tác dụng phụ lần hai | chưa trích | Đúng theo (a)=(b) (lời subagent, JSON/ảnh chưa được agent chính mở lại) | |
| Ma trận AC ↔ test | Output runner | `npm test` API 150/150, UI 65/65 | không có danh sách tên test vòng này | từng test trong ma trận xanh | chưa trích | **Chưa xác minh từng dòng ma trận** | Cần xuất danh sách test hoặc grep tên test trong output |
| SePay Test mode (V1-4, plan mục "Kế hoạch QA") | Dashboard + 5 giao dịch provider | không chạy | BLOCKED | exact/under/over/late/promo qua provider thật | chưa trích | **BLOCKED** | PASS vòng 10 giữ nguyên lịch sử, không dùng làm PASS vòng 12 |
| S8-07 / V11-1 | Browser | chưa chạy hai chuyển trạng thái | NOT VERIFIED | UI hiện kết quả server thật sau xác nhận thủ công và sau webhook | chưa trích | **NOT VERIFIED** | |

## Đối chiếu spec (cấp tính năng)
| Mục của spec | Loại | AC hoặc bước đã chạy | Kết quả thật | Kết luận |
|---|---|---|---|---|
| S8-01..S8-06 (spec `.devloopflow/specs/20261109-sprint08-payment.md`, mục Mục tiêu) | mục tiêu | HTTP/SQL `L/` | PASS (xem bảng) | Đúng theo (a)=(b); trích nguyên văn spec chưa ghi |
| S8-07 (UI tablet thật) | mục tiêu | browser | chỉ CASH/zero/retry có ảnh | **NOT VERIFIED** |
| QR/SePay Test mode | mục tiêu | provider | không chạy | **BLOCKED** |
| Hoàn tiền tự động, chia thanh toán, chi két (phi mục tiêu) | phi mục tiêu | R21 (`expenseAmount=0`), tìm endpoint hoàn tiền | không có hành vi làm thừa (theo subagent) | Đúng theo (a); chưa trích spec |
| Không ghi payment hai lần, webhook giả bị chặn, không lộ cross-store, ca đóng không thanh toán được | phản mục tiêu | RF-*, R12-SCOPE-*, R21-* | PASS | Đúng theo (a); chưa trích spec |
| Tiền `bigint`, store lấy từ danh tính, HMAC trên raw body | ràng buộc | HTTP | PASS | Đúng theo (a); chưa trích spec |

## FAIL / bug (mỗi FAIL cũng được lưu vào sổ `fails.md`)
- **V12-1** (loại: errors/ thiếu):
  - Bước tái hiện: lấy các id `B-<n>` ghi "đã sửa" trong `tasks/active/20261109-sprint08-payment.md` (mục "Lịch sử review", "Lịch sử kiểm AC") rồi tìm trong `.devloopflow/errors/*.md`.
  - Kỳ vọng: mỗi finding đã sửa có file `errors/` đủ mục, hoặc lý do hợp lệ không ghi trong task (`ac-verifier.md` bước 10).
  - Thực tế (agent chính đã chạy lại `grep -l "<id>\b" .devloopflow/errors/*.md`): **B-22, B-23, B-24, B-25, B-26, B-27, B-32, B-33 đều có 0 file `errors/`**. Cả 8 là finding Low/Very Low đã sửa qua fix-backlog (test hoặc tài liệu), có dòng trong `.devloopflow/review/backlog.md` (dòng 30–41, trạng thái `đã sửa`, B-23 ghi "một phần"). `errors/` có file cho các mục backlog khác (ví dụ B-21 → `20261110-payment-preview-reload-error-swallowed.md`).
  - Tài liệu không quy định: `ac-verifier.md` bước 10 không nói mục backlog Low đã sửa có được tính là "lý do hợp lệ không ghi" hay không. Chờ user quyết; không tự cho là hợp lệ.
  - Các id khác không có file `errors/` (B-13..B-16, B-18, B-20, R3-2, R4-2, R4-4, R6-2, R8-2, R8-4, R9-2..R9-5, R10-1..R10-3, R11-1/2, R12-1..R12-4, R13-1): subagent báo trạng thái là chờ xử lý, không sửa hoặc đã gộp; **agent chính chưa xác minh từng id**.
  - Path bằng chứng: `.devloopflow/review/backlog.md`, `.devloopflow/errors/INDEX.md`, task file dòng 257–278.
  - Test tái hiện đề xuất: `errors_cover_fixed_findings` (kiểm tài liệu, không phải test mã) | input: danh sách id đã sửa trong task | kết quả mong đợi: mỗi id có file `errors/` hoặc dòng lý do trong task/backlog được user chấp nhận.
- **V1-4** (đang mở): BLOCKED. Bước tái hiện: cấu hình SePay Test mode đúng account POS, tạo QR, mô phỏng 5 giao dịch (plan "Kế hoạch QA" mục SePay Test mode thật). Thực tế: không có phiên dashboard/tài khoản test trong browser verifier điều khiển được. Điều kiện gỡ: xem Đề xuất.
- **V11-1** (đang mở): NOT VERIFIED một phần, xem sổ `fails.md`.

## Lệch tài liệu
- Không có lệch mới.
- Tài liệu không quy định: `specs/sales.md:17` (theo subagent) cấp `invoice.cancel_open` chỉ cho OWNER/CASHIER, MANAGER có ca bán được nhưng bị 403 khi hủy đơn OPEN của chính mình (attempt2, `evidence/r12-live-attempt2-harness-bug/`). Chưa có quyết định PO; agent chính chưa mở lại `specs/sales.md:17`.

## Đánh giá test
- API 150/150, UI 65/65, không skip/cancel. Chưa đọc từng test để đánh giá assert rỗng hoặc mock quá tay trong vòng này. Test 70 assertion của harness ghi `expected` và `actual` trong `assertions.jsonl` (kiểm 1 dòng đầu bởi agent chính).

## Exploratory
- Xem mục "Đã đối chiếu errors": các ca X-* của harness (đều PASS theo `assertions.jsonl`). Ca UI của lỗi cũ chưa chạy.

## Đề xuất
1. **V1-4:** cần người dùng đăng nhập dashboard SePay (Test mode) trong browser mà verifier điều khiển được, tunnel tới API sandbox, tài khoản POS trùng tài khoản Test, và cho phép mô phỏng 5 giao dịch (exact/under/over/late/promo). Không có thì giữ BLOCKED, không suy là PASS.
2. **V11-1 / UI còn lại:** chạy lại browser trên môi trường sandbox ổn định cho: QR pending → reload → hủy; xác nhận thủ công MANAGER/OWNER → UI thành công; auto-PAID do webhook → poll PAID; bank settings 19/20 chữ số; đổi session; ảnh QR lỗi fallback.
3. **V12-1:** user quyết backlog Low đã sửa có được miễn file `errors/` không; nếu không, ghi file cho 8 mục trên.
4. **Quy trình:** subagent không ghi được file trong phiên này; cân nhắc cho phép ghi trong `.devloopflow/verify/<id>/` hoặc ghi report ngay đầu lượt. Nên tạo `qa-evidence/<ts>-<sha>-s8-verify-ac-r12/run.md` theo `AGENTS.md` khi chạy lại.
5. **Ma trận AC ↔ test:** xuất danh sách tên test từ output runner và đối chiếu từng dòng ma trận ở lần chạy sau.
6. **Quyền hủy đơn của MANAGER** (`invoice.cancel_open`): hỏi PO có cấp cho MANAGER có ca bán không.

---

## Phụ lục 12b — lượt provider SePay Test mode + UI (V1-4, V11-1), 2026-11-11 16:48–17:00 (UTC+7)

Người dùng duyệt chạy toàn bộ (tunnel + giao dịch mô phỏng) sau khi nhận báo cáo chính của vòng 12. Do **agent chính** chạy trực tiếp (không qua subagent), local, sandbox. Nhãn: **local do agent chạy**; provider thật là SePay Test mode. Không phải CI/runner độc lập, không phải `ac-verifier` context sạch: kết luận cuối vẫn phải do `ac-verifier` đặt khi chạy lại verify-ac.

### Môi trường và nguồn
- Mã: HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf` + working tree dirty (mã cuối của Sprint 08), API `npm start` cổng 13061, UI Vite cổng 15195, PostgreSQL sandbox `pos_s8_r12_pg` (DB `pos_s8_qa_r12p_*`, tạo mới cho lượt này).
- Secret webhook: đọc từ `POS_API/.env` vào RAM, không ghi/in. Mật khẩu fixture là hằng sandbox trong `evidence/scripts/r12p-up.cjs`.
- Tunnel: `ngrok http 13061 --url=makeover-scanning-condiment.ngrok-free.dev`; sau lượt chạy đã dừng (endpoint công khai trả 404).
- Scripts: `evidence/scripts/r12p-up.cjs` (dựng stack, 6 hóa đơn có QR PENDING), `evidence/scripts/r12p-audit.cjs` (DB `BEGIN READ ONLY`). Toàn bộ artifact: `evidence/r12-provider/` và `evidence/r12-sepay-dashboard-capture.txt`.
- Tài khoản nhận POS (OWNER PATCH khi dựng): bankBin 970423, số `0000000003`, trùng tài khoản TPBank `0000000003` trong SePay Test mode (dashboard: `MBBank - 0001`, `Vietcombank - 0002`, `TPBank - 0003`, công tắc Test mode bật, nhãn "dữ liệu không ảnh hưởng tài khoản thật").

### Provider (V1-4): 5 giao dịch Test mode thật
Mỗi giao dịch gửi từ màn "Mô phỏng giao dịch" của user (tab đã mở sẵn), tài khoản `0000000003`, "Tiền vào", nội dung = mã lượt QR 18 ký tự. Trước/sau: `evidence/r12-provider/audit-before.json`, `audit-after-<ca>.json`, `audit-final.json`.

| Ca | Giao dịch SePay | Số tiền (đơn) | ngrok → API | Event trong DB | Hóa đơn | Payment / kho |
|---|---|---|---|---|---|---|
| EXACT | #48010 `HD09AV4JC7IN2LS6SZ` | 25.000 (25.000) | 200 `{"success":true}` | `48010` `PAID` | PAID | 1 payment WEBHOOK 25.000/25.000, 1 SALE `-2`, nguồn SYSTEM, actor NULL |
| UNDER | #48011 `HDCDS2KYW3ZSB8GXUZ` | 24.000 (25.000) | 200 | `48011` `UNDERPAID` | OPEN | không payment mới, không movement |
| OVER | #48012 `HDCBS5R6NQOKG1POZ2` | 30.000 (25.000) | 200 | `48012` `PAID` | PAID | payment amount 25.000, thực nhận 30.000, dư 5.000, 1 SALE |
| LATE | #48013 `HD80RCME5VSPMRDFG6` (lượt A đã hủy) | 25.000 (25.000) | 200 | `48013` `ATTEMPT_CANCELLED` | OPEN (lượt B vẫn PENDING) | không payment, không movement |
| PROMO | #48014 `HDHJEIRVT9GL87MC95` | 15.000 (15.000, mã QAPV hết hạn lúc QR chờ) | 200 | `48014` `PROMOTION_INVALID` | OPEN | không payment, `used_count`=0, không movement |

- Dashboard SePay sau lượt chạy: giao dịch 48010–48014 mỗi giao dịch có 1 webhook; lịch sử gửi #69557–#69561 đều `200 OK` (`evidence/r12-provider/sepay-dashboard-after.txt`). Màn mô phỏng ca EXACT: "Hệ thống của bạn đã xác nhận giao dịch", 559ms.
- Request thật tới API (ngrok inspector, che chữ ký): `evidence/r12-provider/ngrok-webhooks.redacted.json`: 5 POST `/api/v1/payments/sepay/webhook`, HTTP 200, body `{"success":true}`, payload id 48010–48014 khớp `provider_event_id` trong DB. API chấp nhận HMAC bằng secret của `POS_API/.env` (không có 401).
- Mã thanh toán SePay tách đúng 18 ký tự `HD`+16 (payload `code` = mã lượt QR của POS, theo `evidence/r12-provider/ngrok-webhooks.redacted.json`).
- Phạm vi chưa kiểm trong lượt này: replay cùng event id từ provider (RF-1 đã có ở harness local vòng 12), GET invoice qua `curl` có xác thực (UI poll `GET /invoices/{id}` và DB thay thế, xem dưới).

### UI (V11-1): hai chuyển trạng thái còn thiếu
- **Auto-PAID do webhook**: thu ngân `qa12p_cashier` mở hóa đơn `HD09AV4JC7`, hộp thoại "Đang chờ chuyển khoản" (QR VietQR TPBank, số `0000000003`, nội dung `HD09AV4JC7IN2LS6SZ`, cảnh báo "Tồn kho sẽ âm; vẫn có thể bán.") — `evidence/r12-provider/ui/r12p-ui-exact-before_2026-11-11T09-49-51-605Z.png`. Sau khi giao dịch #48010 gửi, UI tự chuyển "Thanh toán thành công.", hóa đơn rời danh sách, không thao tác thêm — `.../r12p-ui-exact-after_2026-11-11T09-51-03-464Z.png` (agent chính đã mở và đọc cả hai ảnh). DB: PAID, 1 payment WEBHOOK, 1 SALE.
- **Quản lý thấy ngoại lệ**: `qa12p_manager` (MANAGER, không có ca riêng) thấy 4 đơn mở và hộp thoại có nút "Xác nhận thủ công" và mục "Giao dịch cần đối soát" với đúng 3 ngoại lệ từ provider: "Mã giảm giá không còn hiệu lực · 15.000đ", "Chuyển sau khi hủy chờ · 25.000đ", "Chuyển thiếu tiền · 24.000đ" — `.../r12p-ui-manager-before-manual_2026-11-11T09-54-58-716Z.png` (ảnh chưa được agent chính mở lại; nội dung chữ đọc từ DOM `innerText`).
- **Xác nhận thủ công trên UI**: lần 1 trên `HDNAWHODYY` (ca UIMANUAL): hộp thoại đóng, "Thanh toán thành công.", đơn rời danh sách — `.../r12p-ui-manager-after-manual_2026-11-11T09-55-36-179Z.png` (chưa mở lại). DB: payment `MANUAL`, lý do được lưu, `confirmed_by` = `qa12p_manager`, `transaction_ref_kind` BANK, movement SALE nguồn `USER`; số ca dùng cho mọi hóa đơn = 1 (ca gốc của thu ngân; `evidence/r12-provider/manual-confirmer.txt`). Lần 2 trên `HD80RCME5V` (đơn đã có event `ATTEMPT_CANCELLED` từ webhook muộn), **có bắt network**: `POST /api/v1/transfer-attempts/04a0185b-…/confirm-manual` → **201 Created** (`Idempotency-Key` UUID, CSRF che) — `evidence/r12-provider/ui-network-manual-confirm.redacted.txt`. Dialog hiện đúng lượt B (`HD80RCME5VMSZ2K1AD`), không phải mã A đã hủy.
- Poll của UI: `GET /invoices/{id}` + `GET /invoices/{id}/transfer-attempts` mỗi ~3 giây khi hộp thoại mở (từ bắt network).
- Quan sát (không kết luận lỗi): danh sách "Đơn đang mở" của thu ngân vẫn hiện đơn OVER (`HDCBS5R6NQ`) sau khi DB đã PAID cho tới khi bấm "Tải lại đơn" (sau đó biến mất). Tài liệu/plan không quy định danh sách phải tự làm mới; ghi nhận để PO/QA cân nhắc.
- Chưa kiểm trong lượt này: network browser của ca EXACT auto-PAID (chỉ có ảnh trước/sau và DB), tablet ngang đúng viewport thiết kế (viewport thực đo 1407×731, không phải cửa sổ 1366×900 đã yêu cầu), reload giữ mã khi QR PENDING và ảnh QR lỗi fallback (đã có ở vòng 11 theo `fails.md`).

### Kết luận của phụ lục (chưa phải kết luận verify-ac)
- V1-4: đã có bằng chứng provider Test mode trên mã cuối cho 5 ca (EXACT/UNDER/OVER/LATE/PROMO) với dashboard, ngrok request/response, DB trước/sau. Đề xuất `ac-verifier` đối chiếu lại và đặt `đã PASS` nếu chấp nhận bằng chứng này; chưa đổi trạng thái ở `fails.md`.
- V11-1: đã có chuyển trạng thái UI auto-PAID, xác nhận thủ công (có network) và danh sách ngoại lệ cho MANAGER; còn thiếu phần liệt kê ở mục "Chưa kiểm". Chưa đổi trạng thái.
- Dọn dẹp: API/UI/ngrok đã dừng; container `pos_s8_r12_pg` đã tắt (dữ liệu giữ); không xóa DB.
