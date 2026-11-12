# Kiểm AC report 20261109-sprint08-payment — vòng 3 (chạy lại V1-2, V1-3, V2-1, V2-2)

## Kết luận
FAIL cho toàn task (còn V1-4, V3-1, V3-2 mở). PASS cho 4 mục chạy lại: V2-2, V2-1, V1-2, V1-3.
- Ngày: 2026-11-09. Nhãn: **local do agent chạy** (ac-verifier); artifact thô chỉ có ở máy local. Report do agent chính ghi lại từ report của subagent (subagent bị chặn ghi file report); agent chính chưa mở lại từng artifact thô.
- Commit 48ed476, working tree dirty (70 mục, bằng lúc bắt đầu; verifier không sửa file dự án).
- Plan: .devloopflow/plans/active/20261109-sprint08-payment.md (giống hệt approved). Spec: .devloopflow/specs/20261109-sprint08-payment.md, 20261109-sprint08-payment-api.md, specs/invoices.md.
- Bằng chứng thô: `.devloopflow/verify/20261109-sprint08-payment/evidence/r3-api-run/` và `r3-scripts/`; `qa-evidence/20261109-180900-48ed476-s8-verify-ac-r3/run.md`.

## Phạm vi
- Chạy lại: V2-2, V2-1, V1-2 (D-1..D-10), V1-3 (D-11..D-18), `npm test` POS_API + POS_UI, `npm run build` POS_UI.
- Không chạy lại: V1-4 (thiếu tài khoản/secret SePay Test mode); E2E-AC-1..7, ST-1..ST-8, RF-1..5 và UI trình duyệt lần 1. V1-1 đã PASS ở lần 2, R3-C1..C10 là hồi quy.

## Môi trường
- PostgreSQL sandbox Docker `pos_sprint08_test_pg` (127.0.0.1:55432), DB riêng `pos_s8_verify3`, `migration:run` exit 0, API `node dist/main.js` cổng 3000 (`SEPAY_ENV=test`, secret tạm), khởi động lại 4 lần cho ca cấu hình. Không chạy UI trình duyệt.
- Sự cố: Docker Desktop tự dừng giữa lần `npm test` đầu (19/30 file ECONNREFUSED); lần đó không tính (`qa-evidence/20261109-180900-48ed476-s8-verify-ac-r3/invalid-run1-docker-down/`). Mở lại Docker Desktop, `docker start pos_sprint08_test_pg` (dữ liệu còn), chạy lại toàn bộ.
- Đã dọn: dừng API theo PID; `DROP DATABASE` `pos_s8_verify3` và `pos_pb02_test_943233ef3607` (WITH FORCE, DB thứ hai do lần `npm test` bị gián đoạn để lại); không `down -v`, không xóa volume, không động `pos_local`.

## Kết quả test
- `npm test` POS_API: exit 0; 126 test, 126 pass, 0 fail (có `ok 6 … [V1-1]`, `ok 7 - test_ST6_unsigned_without_headers_returns_401 [V2-2]`).
- `npm test` POS_UI: exit 0; 53/53. `npm run build` POS_UI: exit 0. Coverage: dự án không có lệnh.

## V2-2 (specs/invoices.md:122 "request unsigned khi đã cấu hình trả 401 INVALID_WEBHOOK_SIGNATURE")
| ID | Tình huống | Thực tế | DB | Kết luận |
|---|---|---|---|---|
| R3-U1 | JSON hợp lệ, không header | 401 INVALID_WEBHOOK_SIGNATURE "Chữ ký webhook không hợp lệ." | không đổi | Đúng |
| R3-U2, C2b | not-json, không header | 401 | không đổi | Đúng |
| R3-U3..U7 | hai header rỗng / thiếu signature / signature rỗng | 401 | không đổi | Đúng |
| R3-U11..U13, C2, C3c | chữ ký sai / "garbage" / thiếu tiền tố sha256= | 401 | không đổi | Đúng |
| R3-C1, C6, C6b, C7, C10 | JSON hỏng/rỗng/mảng/cụt + chữ ký đúng | 400 INVALID_WEBHOOK_PAYLOAD "Nội dung webhook không hợp lệ." | không đổi | Đúng |
| R3-C3, C3b | timestamp cũ 1h + chữ ký đúng | 400 "Thời gian webhook không hợp lệ." | không đổi | Đúng |
| R3-C4 | JSON hợp lệ ký đúng, QR PENDING | 200; PAID, 1 payment 40000 WEBHOOK | PAID | Đúng |
| R3-C5, C5b | replay | 200 | không đổi | Đúng |
| R3-env | thiếu secret / SEPAY_ENV=live / thiếu SEPAY_ENV | 503 SERVICE_UNAVAILABLE | không đổi | Đúng |
| R3-C9 | text/plain + not-json ký đúng | 4xx, không mutation | không đổi | Tài liệu không quy định |
| R3-U8..U10 | có chữ ký, timestamp rỗng/thiếu/rác | 400 "Thời gian webhook không hợp lệ." | không đổi | Tài liệu không quy định |
Kết luận V2-2: **PASS** (lần 2: thiếu header = 400; nay 401).

## V2-1
Plan active :136, approved :136 (giống hệt) và specs/invoices.md:122 ghi: INVALID_WEBHOOK_SIGNATURE 401 “Chữ ký webhook không hợp lệ.”; INVALID_WEBHOOK_PAYLOAD 400 “Nội dung webhook không hợp lệ.” (timestamp: “Thời gian webhook không hợp lệ.”). Response thật (evidence/r3-api-run/r3-error-messages.txt) khớp từng ký tự. Kết luận V2-1: **PASS** (phạm vi webhook). Phát hiện thêm V3-1 ở 5 mã khác trên cùng dòng.

## V1-2 (D-1..D-10)
| Mục | Đối chiếu thật | Kết luận |
|---|---|---|
| D-1 BR-33 (BUSINESS_RULES.md:162) | Khóa đơn: 409 TRANSFER_PENDING (R3-E1a..d). Thừa: amount 40000, actual 45000, excess 5000, total_amount 40000 (R3-P4). Thiếu: OPEN, UNDERPAID, manager thấy (R3-P1, P1b). Hủy: ATTEMPT_CANCELLED (R3-P5). Không mở/promo: test xanh. Manual: R3-E4, E5a, E6. **Sai tài khoản (R3-P2): đơn OPEN nhưng event QUARANTINED, store_id NULL, route ngoại lệ không liệt kê** | PASS các vế khác; vế "sai tài khoản" = V3-2 |
| D-2 BR-34 | R3-E2a/E2b/E5b/E5c; transfer_attempts.idempotency_key uuid NOT NULL UNIQUE | Đúng |
| D-3 BR-75 | R3-E9/E9b: dài 18, ^HD[A-Z0-9]{16}$, bắt đầu bằng invoice_code (10) | Đúng |
| D-4 banner THIRD:3 | R3-C*/U*; URL img.vietqr.io (transfer-attempts.service.ts:38) | Đúng |
| D-5 SEPAY_ENV | 4 cấu hình: không secret 503; live 503; thiếu env 503; test+secret xử lý bình thường | Đúng |
| D-6 | createHmac trong payment.integration.test.ts; không có script SePay riêng | Đúng |
| D-7 | R3-E9, E9b, E9c (addInfo = transfer_reference) | Đúng |
| D-8 | Đọc LivePaymentDialog.tsx:89-92; UI test xanh; ảnh lần 1; không chạy lại trình duyệt | Đúng (theo code + lần 1) |
| D-9 | R3-C4, E1, P1, P5, DUPLICATE, Q2/Q3 (403), E1e (409), E5a; không có expire/ttl; **sai tài khoản R3-P2: quản lý không thấy** | PASS trừ vế "sai tài khoản" = V3-2 |
| D-10 | `cmp AGENTS.md CLAUDE.md` → giống hệt | Đúng |
Kết luận V1-2: **PASS** cho các lệch gốc; văn bản mới có một vế sai → V3-2.

## V1-3 (D-11..D-18)
| Mục | Đối chiếu | Kết luận |
|---|---|---|
| D-11 7 mã lỗi (api-spec.md:368-374) | Gây ra thật: TRANSFER_PENDING 409 (E1), TRANSFER_NOT_PENDING 409 (E3b/E3c), BANK_ACCOUNT_REQUIRED 409 (E7, store thứ hai), BANK_TRANSACTION_REUSED 409 (E6), TRANSFER_AMOUNT_INSUFFICIENT 422 (E4), INVALID_WEBHOOK_SIGNATURE 401, INVALID_WEBHOOK_PAYLOAD 400 | Đúng |
| D-12 route mục 11 (api-spec.md:483-484) | R3-E10a..l: preview/apply/remove 200, complete-zero 422 ZERO_TOTAL_REQUIRED, store-bank-account GET/PATCH, transfer-attempts GET/POST, exceptions 200 (MANAGER)/403 (CASHIER), webhook 401, id lạ 404; quyền R3-Q1..Q3 | Đúng |
| D-13 idempotency (api-spec.md:412) | R3-E2a, E2b, E5b, E5c | Đúng |
| D-14..D-17 DESIGN_DB | Schema 6 bảng + stock_movements khớp: cột, kiểu, CHECK, FK RESTRICT, index (uq_transfer_attempts_pending_invoice, idx_transfer_attempts_store_status, idx_bank_transfer_events_scope, uq_payments_bank_transaction), ck_stock_movements_actor; invoice_promotion_codes PK invoice_id, không created_at | Đúng |
| D-18 specs/invoices.md:118,121 | PATCH 5→422, 6→200, 20→422, 19→200; DB từ chối 20 và 5, nhận 19 | Đúng |
Kết luận V1-3: **PASS**.

## FAIL / Lệch tài liệu mới
- **V3-1:** message của 5 mã lỗi trong plan :136 / approved :136 / specs/invoices.md:122 khác response thật (chi tiết trong fails.md). Mã lỗi và HTTP đúng.
- **V3-2:** BUSINESS_RULES.md:162 và THIRD_PARTY_INTEGRATIONS.md:28 nói "sai tài khoản" được báo quản lý; spec :101 và code quarantine nội bộ, route ngoại lệ không liệt kê. Văn bản mới (D-1, D-9) mâu thuẫn spec; verifier không chọn bên.

## Quan sát (không FAIL)
- THIRD_PARTY_INTEGRATIONS.md:11,13,21 còn chữ "dự kiến"/"cần đặc tả riêng".
- docs/api-spec.md:57 (bảng header Idempotency-Key) chưa nhắc QR và xác nhận thủ công.
- Không chạy lại UI trình duyệt.
- `PUT /product-sizes/{id}/recipe` trả 422 trong script dựng dữ liệu (cả lần 2), chưa điều tra.
- Thiếu test tự động cho U8..U10, U13, message của 5 mã (V3-1), wrong-account trong danh sách ngoại lệ (V3-2).

## Lỗi của chính verifier
`r3extra.mjs` dùng `f.users.admin` không tồn tại; phần E7 chạy lại bằng `r3extra2.mjs`.

## Đề xuất
1. User quyết V3-1 và V3-2 (sửa tài liệu hay code).
2. Sau đó cập nhật api-spec.md:57 và THIRD_PARTY_INTEGRATIONS.md:11,13,21.
3. V1-4 cần tài khoản/secret SePay Test mode.
4. Thêm test tự động cho U8..U10, U13 sau khi Product Owner chốt hành vi.
