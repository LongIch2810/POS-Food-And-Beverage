# Backlog lỗi nhẹ (Low, Very Low) chờ xử lý
<!-- Do agent chính ghi vào .devloopflow/review/backlog.md khi user chọn "đưa vào backlog" ở bước 10 của run (hoặc khi review dùng rời và user muốn xử lý sau). Được commit nên chỉ ghi tóm tắt và trích đoạn ngắn không nhạy cảm, không secret. Chỉ thêm, không xoá mục cũ; đổi trạng thái khi xử lý và ghi thêm dòng lịch sử. Xử lý các mục bằng /devloopflow:fix-backlog. -->

- Cập nhật lần cuối: 2026-11-14
- Id `B-<n>` tăng dần trong toàn dự án, không dùng lại.

## Tổng hợp
| Id | Mức | Task nguồn | File:dòng | Tóm tắt (một dòng) | Ngày ghi | Trạng thái |
|---|---|---|---|---|---|---|
| B-1 | Low | 20261109-sprint08-payment (review vòng 3, R3-3) | `POS_UI/src/features/pos/LivePaymentDialog.tsx:34-42,60-62,72-73,120` | Manual uncertain rồi attempt bị poll/hủy xóa thì dialog không đóng được, phải reload (không mất tiền) | 2026-11-10 | đã sửa |
| B-2 | Low | 20261109-sprint08-payment (review vòng 3, R3-4) | `POS_API/src/sales/transfer-attempts.service.ts:24`, `POS_API/src/sales/sales.service.ts:46` | Người không có `branch.access_all` và `branchId=null` đọc được mọi branch (fail-open; `list()` trả 403) | 2026-11-10 | đã sửa |
| B-3 | Low | 20261109-sprint08-payment (review vòng 3, R3-5) | `POS_API/src/sales/sales.service.ts:321-323` | `paymentPreview` tính lại giá cho đơn không còn OPEN thay vì trả snapshot/409 | 2026-11-10 | đã sửa |
| B-4 | Low | 20261109-sprint08-payment (review vòng 4, R4-1) | `POS_API/src/auth/auth-config.ts:16-19` | `SEPAY_WEBHOOK_SECRET` chấp nhận 1 ký tự, không có ngưỡng độ dài như JWT/CSRF secret | 2026-11-10 | đã sửa |
| B-5 | Low | 20261109-sprint08-payment (review vòng 4, R4-3) | `AGENTS.md:29` (và `CLAUDE.md:29`) | Mô tả `THIRD_PARTY_INTEGRATIONS.md` còn ghi "chưa kiểm SePay Test mode thật" sau khi V1-4 đã PASS (phần "chưa triển khai" đã được sửa) | 2026-11-10 | đã sửa |
| B-6 | Very Low | 20261109-sprint08-payment (review vòng 4, R4-5) | `POS_API/graphify-out/` | Thư mục `graphify-out/` chưa được theo dõi hoặc ignore trong Git (`git status`: `??`) | 2026-11-10 | đã sửa |
| B-7 | Low | 20261109-sprint08-payment (review vòng 6, R6-3) | `POS_API/src/sales/transfer-attempts.service.ts:125,135` | Replay xác nhận thủ công với `attemptId` viết hoa bị 409 thay vì replay (không chuẩn hóa UUID trước khi băm và so sánh) | 2026-11-10 | đã sửa |
| B-8 | Low | 20261109-sprint08-payment (review vòng 6, R6-4) | `docs/api-spec.md:374` | Tài liệu ghi `INVALID_WEBHOOK_PAYLOAD` cho timestamp sai khi chữ ký đúng; code kiểm timestamp trước HMAC | 2026-11-10 | đã sửa |
| B-9 | Low | 20261109-sprint08-payment (review vòng 6, R6-5) | `specs/invoices.md:57` | Danh sách lỗi apply-promotion thiếu `409 SHIFT_NOT_OPEN` (code trả qua `writable()`) | 2026-11-10 | đã sửa |
| B-10 | Low | 20261109-sprint08-payment (review vòng 6, R6-6) | `POS_API/src/auth/tests/auth.integration.test.ts:190-191` | Assertion PB-02 chọn dòng `refresh_tokens` sớm nhất theo `created_at` toàn bảng, không lọc theo phiên vừa refresh; có thể chọn nhầm dòng | 2026-11-10 | đã sửa |
| B-11 | Very Low | 20261109-sprint08-payment (review vòng 6, R6-7) | `POS_API/src/sales/tests/payment.integration.test.ts:1161,1221` | Test `[R5-2]` dùng lại event id 6201 của `test_ST6_transfer_amounts`, phụ thuộc ngầm giữa hai test | 2026-11-10 | đã sửa |
| B-12 | Very Low | 20261109-sprint08-payment (review vòng 6, R6-8) | `POS_API/src/sales/transfer-attempts.service.ts:149` | Thông báo `PROMOTION_NOT_APPLICABLE` khác các chỗ còn lại (thiếu "Đổi hoặc bỏ mã để thanh toán.") | 2026-11-10 | đã sửa |
| B-13 | Low | 20261109-sprint08-payment (review vòng 4, case test thiếu) | `POS_API/src/sales/tests/payment.integration.test.ts` (nhóm webhook ST-6) | Thiếu test: timestamp lệch +301 giây; body đổi nhưng giữ chữ ký cũ; chữ ký sai định dạng | 2026-11-10 | đã sửa |
| B-14 | Low | 20261109-sprint08-payment (review vòng 4, case test thiếu) | `POS_API/src/sales/tests/payment.integration.test.ts` (hủy lượt QR) | Thiếu test: hủy lượt QR nhánh 403; hủy lượt QR khi ca đã đóng trả 409 `SHIFT_NOT_OPEN` | 2026-11-10 | đã sửa |
| B-15 | Low | 20261109-sprint08-payment (review vòng 4, case test thiếu) | `POS_API/src/sales/tests/payment.integration.test.ts` (promo và QR chờ) | Thiếu test: mã khuyến mãi hết lượt cuối khi có hai đơn đang chờ QR cùng mã | 2026-11-10 | đã sửa |
| B-17 | Low | 20261109-sprint08-payment (review vòng 8, R8-1) | `POS_UI/src/features/pos/LivePaymentDialog.tsx:40,81,97-102` | Khi poll đổi sang lượt QR khác, "Cần thanh toán" và form xác nhận thủ công giữ số liệu lượt cũ; server vẫn chặn đúng (422), không sai tiền | 2026-11-10 | đã sửa |
| B-18 | Very Low | 20261109-sprint08-payment (review vòng 8, R8-2) | `THIRD_PARTY_INTEGRATIONS.md:21` | Ghi "Cách dùng dự kiến" cho VietQR Quick Link trong khi đã triển khai (`transfer-attempts.service.ts:38`) | 2026-11-10 | đã sửa |
| B-19 | Very Low | 20261109-sprint08-payment (review vòng 8, R8-3) | `POS_API/src/http/api-error.filter.ts:51` | Regex `/\/+$/` bỏ nhiều dấu `/` cuối trong khi router chỉ nhận một; `webhook//` và `webhook/` cho kết quả khác nhau | 2026-11-10 | đã sửa |
| B-20 | Very Low | 20261109-sprint08-payment (review vòng 8, R8-4) | `specs/invoices.md:85`; `POS_API/src/sales/transfer-attempts.service.ts:98` | Spec không liệt kê `409 CONFLICT` của POST transfer-attempts khi không tạo được mã duy nhất | 2026-11-10 | đã sửa |
| B-21 | Low | 20261109-sprint08-payment (review vòng 9, R9-1) | `POS_UI/src/features/pos/LivePaymentDialog.tsx:40` | Lỗi tải lại preview khi đổi lượt QR bị nuốt: `.catch` chỉ gọi `setError` khi `active` còn true, nhưng cleanup effect đã đặt `active=false` khi `attempt?.id` đổi; dialog vẫn hiện số tiền cũ, không báo lỗi (server vẫn chặn đúng) | 2026-11-10 | đã sửa |
| B-22 | Low | 20261109-sprint08-payment (review vòng 9, R9-2) | `POS_API/src/sales/tests/payment.integration.test.ts:1433` | Test `[B-13]` timestamp +301 giây có thể chập chờn ở ranh giới giây; nên dùng +302 | 2026-11-10 | đã sửa |
| B-23 | Low | 20261109-sprint08-payment (review vòng 9, R9-3) | `POS_API/src/sales/tests/payment.integration.test.ts:166` | B-14 thiếu ca 403 khi hủy lượt QR (người không có chi nhánh hoặc thiếu `pos.sell`) | 2026-11-10 | đã sửa (một phần: thiếu ca `pos.sell`) |
| B-24 | Low | 20261109-sprint08-payment (review vòng 9, R9-4) | `POS_API/src/sales/tests/payment.integration.test.ts:229,232,237` | B-15 dùng event id 7501 trùng `[V3-2]` và phải DELETE dữ liệu để tránh lệch; nên dùng id riêng | 2026-11-10 | đã sửa |
| B-25 | Very Low | 20261109-sprint08-payment (review vòng 9, R9-5) | `THIRD_PARTY_INTEGRATIONS.md:3` | Nhãn ngày "09/11/2026" nhưng nội dung đã cập nhật 10/11/2026 | 2026-11-10 | đã sửa |
| B-26 | Low | 20261109-sprint08-payment (review vòng 10, R10-1) | `POS_API/src/sales/tests/payment.integration.test.ts:203-204` | Test `[B-23]` dùng user `b16_nobranch` do test `[B-16]` tạo; chạy riêng sẽ lỗi | 2026-11-10 | đã sửa |
| B-27 | Low | 20261109-sprint08-payment (review vòng 10, R10-2) | `POS_API/src/sales/tests/payment.integration.test.ts:203-210` | B-23 còn thiếu ca CASHIER không có `pos.sell` → 403 (quyền đọc động từ `role_permissions`, có thể gỡ trong test) | 2026-11-10 | đã sửa |
| B-28 | Low | 20261109-sprint08-payment (review vòng 10, R10-3) | `README.md:10,13,41` | Câu trạng thái "mô phỏng/demo" lỗi thời so với các màn đã gọi API thật (tài liệu, cần sync-docs) | 2026-11-10 | đã sửa |
| B-29 | Very Low | 20261109-sprint08-payment (review vòng 10, R10-4) | `POS_UI/src/features/settings/SettingsScreen.tsx:273-275` | Lỗi số tài khoản không gắn vào ô nhập (`aria-invalid`, `details.field` của lỗi 422 chưa ánh xạ) | 2026-11-10 | đã sửa |
| B-30 | Low | 20261109-sprint08-payment (review vòng 11, R11-1) | `POS_UI/src/features/settings/SettingsScreen.tsx:104-106` | Lỗi số tài khoản do kiểm tra phía client vẫn hiện ở thông báo chung, không gắn vào ô; `return` trước khi reset `bankAccountError` nên lỗi server cũ có thể còn sót (plan ST-8.AC-2 yêu cầu lỗi tại field) | 2026-11-10 | đã sửa |
| B-31 | Very Low | 20261109-sprint08-payment (review vòng 11, R11-2) | `POS_UI/test/organization-screen.test.mjs:120,131` | Test `[B-29]` dùng thông điệp detail trùng chuỗi mặc định và kiểm bằng `screen.text()` toàn màn hình, không chứng minh được lỗi nằm đúng ô | 2026-11-10 | đã sửa |
| B-32 | Low | 20261109-sprint08-payment (review vòng 12, R12-1) | `README.md:10` | README nói màn Hóa đơn đã nối API thật, nhưng màn Hóa đơn vẫn dùng `mockStorage`/`MockEngine`; Báo cáo hoàn toàn mô phỏng (tài liệu) | 2026-11-10 | đã sửa |
| B-33 | Low | 20261109-sprint08-payment (review vòng 12, R12-2) | `README.md:9` | Bảng "Đã có trong mã" chưa liệt kê bán hàng/thanh toán (Sprint 08) và kho/khuyến mãi (Sprint 07), mâu thuẫn với dòng 13 (tài liệu) | 2026-11-10 | đã sửa |
| B-34 | Low | 20261109-sprint08-payment (review vòng 12, R12-3) | `POS_UI/src/features/settings/SettingsScreen.tsx:104` | Không có test bảo vệ việc xoá cả hai lỗi ở đầu `saveBank`; bỏ dòng này thì `[B-30]` vẫn xanh | 2026-11-10 | đã sửa |
| B-35 | Very Low | 20261109-sprint08-payment (review vòng 12, R12-4) | `POS_UI/src/features/settings/SettingsScreen.tsx:107`; `POS_UI/test/organization-screen.test.mjs:137-152` | Code reset lỗi trùng lặp (dòng 107 lặp dòng 104); test `[B-31]` gần trùng `[B-29]` | 2026-11-10 | đã sửa |
| B-36 | Very Low | 20261109-sprint08-payment (review vòng 13, R13-1) | `.devloopflow/errors/20261110-bank-account-error-not-attached-to-field.md:33` | File lỗi còn ghi test `[B-31]` theo tên cũ (đã gộp vào `[B-29][B-31]`) và thiếu mục B-34, B-35 | 2026-11-10 | đã sửa |
| B-37 | Very Low | 20261109-sprint08-payment (review vòng 17, R17-1) | `.devloopflow/errors/20261111-pay-then-next-order-path-untested.md:4`, `20261111-manager-cancel-open-behavior-untested.md:4`, `20261111-plan-spec-missing-manager-cancel-decision.md:4` | 3 file lỗi mới dùng `found_by: review` (sai giá trị template) và thiếu dòng `Test tái hiện` trong "Cách fix" (tài liệu lỗi) | 2026-11-11 | đã sửa |
| B-38 | Low | 20261109-sprint08-payment (review vòng 17, R17-2) | `specs/invoices.md:39`; `POS_UI/src/features/pos/LivePosScreen.tsx:248` | Spec nói đơn có QR chờ bị khóa cả "thanh toán", nhưng nút "Thanh toán" vẫn hiện cho đơn OPEN có QR chờ (đường mở lại QR/hủy chờ/xác nhận thủ công); lệch tài liệu, cần user duyệt hướng sửa | 2026-11-11 | đã sửa |
| B-39 | Low | 20261109-sprint08-payment (review vòng 16, R16-4) | `POS_UI/src/features/pos/LivePosScreen.tsx:122,209,255` | `notice` của đơn cũ ("Thanh toán thành công.", "Đã hủy đơn.", ...) không bị xóa khi chọn/tạo đơn mới, vẫn hiện khi làm đơn khác | 2026-11-11 | đã sửa |
| B-40 | Low | 20261109-sprint08-payment (review vòng 16, R16-5) | `POS_UI/test/live-payment.test.mjs:332-361` | Thiếu assert "Chuyển bàn" ẩn với đơn DINE_IN không OPEN và nhánh `perform()` trả PAID hiện "Đơn đã đóng."; `[PAID-DONE-1]` gần trùng `[PAID-DONE-4]` | 2026-11-11 | đã sửa |
| B-16 | Low | 20261109-sprint08-payment (review vòng 5, case test thiếu) | `POS_API/src/sales/tests/payment.integration.test.ts` (paymentPreview, createTransferAttempt) | Thiếu test HTTP kiểm phạm vi chi nhánh cho `paymentPreview` và `createTransferAttempt` (đã dùng chung helper được test ở B-2) | 2026-11-10 | đã sửa |
| B-41 | Low | 20261112-sprint09-drawer-cancel-invoices (R1-2) | `POS_API/src/sales/tests/cancel-paid.integration.test.ts:188-192` | Fixture TRANSFER (`seedPaidTransfer`) ghi `SALE` dạng USER; webhook thật ghi `SALE` SYSTEM (`created_by NULL`, `source 'SYSTEM'`) | 2026-11-13 | đã sửa |
| B-42 | Low | 20261112-sprint09-drawer-cancel-invoices (R1-3) | `POS_API/src/sales/sales.service.ts:446,457` | Thiếu test MANAGER `branch_id=NULL` hủy đơn `PAID` (plan có dòng edge case 404 `NOT_FOUND`) | 2026-11-13 | đã sửa |
| B-43 | Low | 20261112-sprint09-drawer-cancel-invoices (R1-4) | `POS_API/src/shifts/http/shifts.dto.ts:72` | `@ApiProperty` của `reason` khai báo bắt buộc nhưng validator `@IsOptional()` (Swagger lệch hành vi) | 2026-11-13 | đã sửa |
| B-44 | Very Low | 20261112-sprint09-drawer-cancel-invoices (R1-5) | `POS_API/src/sales/tests/cancel-paid.integration.test.ts:193; POS_API/src/shifts/http/shifts.response.ts:43-44` | `return invoice;` thụt lề sai (8 khoảng thay vì 6); hai dòng trống liên tiếp ở `shifts.response.ts` | 2026-11-13 | đã sửa |
| B-45 | Very Low | 20261112-sprint09-drawer-cancel-invoices (ST2-M1) | `POS_API/src/shifts/shifts.service.ts (listExpenses, ORDER BY e.created_at DESC, e.id DESC)` | Đột biến chưa test nào bắt: đổi tiebreak `e.id DESC` thành `ASC` | 2026-11-13 | đã sửa |
| B-46 | Very Low | 20261112-sprint09-drawer-cancel-invoices (ST2-M2) | `POS_API/src/shifts/shifts.service.ts (addExpense, `input.reason?.trim()`)` | `.trim()` ở service thừa vì DTO `Transform(trim)` đã trim trước | 2026-11-13 | đã sửa |
| B-47 | Low | 20261112-sprint09-drawer-cancel-invoices (ST5-M1) | `POS_API/src/shifts/shifts.service.ts:83 (cashSales)` | Đột biến chưa test nào bắt: `cashSales` bỏ điều kiện `p.method='CASH'` (tính cả TRANSFER vào tiền mặt); một lần chạy script đột biến thoát exit 1 chưa rõ nguyên nhân | 2026-11-13 | đã sửa |
| B-48 | Low | 20261112-sprint09-drawer-cancel-invoices (R2-N1) | `POS_API/src/sales/sales.service.ts (cancelPaid) và payCash` | Chưa có test cho cặp `payCash` và `cancelPaid` chạy đồng thời (reviewer chưa kiểm chứng deadlock khóa ca `FOR UPDATE OF s,b` và `KEY SHARE` FK) | 2026-11-13 | đã sửa |
| B-49 | Low | 20261112-sprint09-drawer-cancel-invoices (V1-N1) | `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/report-1.md` | ST-5.AC-4/5 (hủy+đóng ca, hủy+chi, hai thứ tự) chỉ có chứng cứ từ `npm test`, chưa chạy HTTP thật bằng app chạy riêng | 2026-11-13 | đã sửa |
| B-50 | Low | 20261112-sprint09-drawer-cancel-invoices (verify-ac lần 2, V2-N1) | `POS_API/src/sales/tests/payment.integration.test.ts:113,157,359,466,501,650,762,896,1258` | Test seed `started_at` bằng `now()` của PostgreSQL nhưng `closeShift` đặt `ended_at` bằng `new Date()` của Node; khi đồng hồ container DB đi trước host hơn ~190 ms, CHECK `chk_work_shifts_ended_at` ném `23514` ở `[R14-1]` và kéo theo 4 test sau (flaky) | 2026-11-13 | đã sửa |
| B-51 | Low | 20261113-sprint09-ui (review vòng 1, R1-7) | `POS_UI/src/features/invoices/InvoicesScreen.tsx:70,80` | Hai catch bỏ toàn bộ lỗi server, thay bằng thông báo chung. Người dùng mất nguyên nhân và mã yêu cầu để tra soát. | 2026-11-13 | đã sửa |
| B-52 | Low | Dùng rời, review riêng B-51 (R1-1) | `POS_UI/test/invoices-screen.test.mjs:117` | Test stale-list reject request đã resolve, chưa thực sự kiểm lỗi của request cũ đang chờ | 2026-11-14 | chờ xử lý |

- Trạng thái: `chờ xử lý` | `đã sửa` | `bỏ` (finding sai, hoặc không còn áp dụng vì code đã đổi; ghi lý do trong lịch sử)

## Chi tiết

### B-1 — Dialog thanh toán kẹt khi manual uncertain (Low)
- Nguồn: task `20261109-sprint08-payment`, review vòng 3, finding R3-3.
- File:dòng: `POS_UI/src/features/pos/LivePaymentDialog.tsx:34-42,60-62,72-73,120`.
- Finding: khi xác nhận thủ công rơi vào trạng thái uncertain và attempt sau đó bị poll/hủy xóa, dialog không đóng được; người dùng phải reload. Không mất tiền.
- Đề xuất sửa: cho phép đóng dialog và đưa về trạng thái an toàn khi attempt không còn tồn tại; test tái hiện ở UI (`POS_UI/test/live-payment.test.mjs`), id test gắn `[B-1]`.

### B-2 — Branch scope fail-open khi branchId = null (Low)
- Nguồn: task `20261109-sprint08-payment`, review vòng 3, finding R3-4.
- File:dòng: `POS_API/src/sales/transfer-attempts.service.ts:24`, `POS_API/src/sales/sales.service.ts:46`.
- Finding: người không có `branch.access_all` mà `branchId=null` đọc được dữ liệu mọi branch. Điều kiện hiện tại: `user.branchId && row.branch_id !== user.branchId` bỏ qua kiểm tra khi `branchId` rỗng. `list()` đã trả 403 trong trường hợp này.
- Đề xuất sửa: từ chối (403/404) khi người dùng không có `branch.access_all` và thiếu `branchId`; test tái hiện ở API, id test gắn `[B-2]`. Có thể ảnh hưởng hành vi đọc của user cũ chưa gán branch, cần đối chiếu `docs/BUSINESS_RULES.md` trước khi sửa.

### B-3 — paymentPreview tính lại giá cho đơn không OPEN (Low)
- Nguồn: task `20261109-sprint08-payment`, review vòng 3, finding R3-5.
- File:dòng: `POS_API/src/sales/sales.service.ts:321-323`.
- Finding: `paymentPreview` gọi `evaluateInvoicePricing` cho đơn không còn OPEN, thay vì trả snapshot hoặc lỗi 409.
- Đề xuất sửa: với đơn không OPEN, trả lỗi phù hợp (409 `INVOICE_NOT_OPEN`) hoặc snapshot; test tái hiện gắn `[B-3]`. Chọn hành vi theo `docs/api-spec.md`.

### B-4 — Secret SePay không có ngưỡng độ dài (Low)
- Nguồn: task `20261109-sprint08-payment`, review vòng 4, finding R4-1.
- File:dòng: `POS_API/src/auth/auth-config.ts:16-19`.
- Finding: `sePayWebhookSecret()` chỉ kiểm tra có giá trị, không yêu cầu độ dài tối thiểu. JWT/CSRF secret có ngưỡng 32 byte.
- Đề xuất sửa: thêm ngưỡng tối thiểu tương tự JWT/CSRF, trả null/lỗi cấu hình khi quá ngắn; test tái hiện gắn `[B-4]`. Không ghi giá trị secret ra log.

### B-5 — Mô tả THIRD_PARTY_INTEGRATIONS trong AGENTS.md/CLAUDE.md đã lỗi thời (Low)
- Nguồn: task `20261109-sprint08-payment`, review vòng 4, finding R4-3.
- File:dòng: `AGENTS.md:29`, `CLAUDE.md:29` (hai file giống nhau).
- Finding (cập nhật 2026-11-10 khi ghi backlog): cụm "chưa triển khai" đã được sửa, nhưng dòng vẫn ghi "**chưa kiểm SePay Test mode thật**" trong khi V1-4 đã PASS ở verify-ac vòng 10 (`.devloopflow/verify/20261109-sprint08-payment/report-10.md`). Cùng vấn đề còn ở `THIRD_PARTY_INTEGRATIONS.md:3,10,12`.
- Đề xuất sửa: cập nhật trạng thái Test mode theo kết quả V1-4 qua `sync-docs`, sau khi user duyệt; `AGENTS.md` và `CLAUDE.md` phải giữ đồng nhất. Lưu ý: `AGENTS.md`/`CLAUDE.md` là file của user, cần duyệt trước khi sửa.

### B-6 — graphify-out chưa được theo dõi (Very Low)
- Nguồn: task `20261109-sprint08-payment`, review vòng 4, finding R4-5.
- File:dòng: `POS_API/graphify-out/` (`git status --short`: `?? POS_API/graphify-out/`).
- Finding: thư mục sinh bởi Graphify chưa được commit hoặc ignore.
- Đề xuất sửa: quyết định commit hay thêm vào `.gitignore`. Không sửa trong backlog này nếu cần quyết định của user; đây là thay đổi cấu hình repo, không phải code.

### B-7 — Replay xác nhận thủ công với UUID viết hoa (Low)
- Nguồn: task `20261109-sprint08-payment`, review vòng 6 (đọc bù), finding R6-3.
- File:dòng: `POS_API/src/sales/transfer-attempts.service.ts:125,135`.
- Finding: `validId()` (`request-validation.ts:5`) chấp nhận UUID viết hoa nhưng không chuẩn hóa; PostgreSQL trả chữ thường nên so sánh `previous.transfer_attempt_id !== attemptId` sai, trả 409 `IDEMPOTENCY_KEY_REUSED` thay vì replay 201. Luồng CASH đã có test cho trường hợp này (`payment.integration.test.ts:421`), luồng manual chưa.
- Đề xuất sửa: chuẩn hóa `attemptId.toLowerCase()` trước khi băm và so sánh; test `[B-7] manual confirm replay with uppercase attempt id`: cùng key/body, path viết hoa hai lần → lần 2 là 201 replay, chỉ 1 payment.

### B-8 — Tài liệu thứ tự kiểm webhook (Low, lệch tài liệu)
- Nguồn: review vòng 6, finding R6-4.
- File:dòng: `docs/api-spec.md:374`; code `POS_API/src/sales/sepay-webhook.service.ts:17-19`.
- Finding: tài liệu ghi `INVALID_WEBHOOK_PAYLOAD` cho timestamp sai khi chữ ký đúng, nhưng code kiểm timestamp trước HMAC (thứ tự 503 → 401 thiếu chữ ký → 400 timestamp → 401 HMAC). Chữ ký giả kèm timestamp cũ hơn 301 giây trả 400, không phải 401.
- Đề xuất sửa: ghi lại mô tả theo thứ tự code: "có header chữ ký; timestamp thiếu/sai/quá ±300 giây kiểm trước HMAC". Không cần test mới.

### B-9 — Spec apply-promotion thiếu SHIFT_NOT_OPEN (Low, lệch tài liệu, M-4)
- Nguồn: review vòng 6, finding R6-5.
- File:dòng: `specs/invoices.md:57`; code `POS_API/src/sales/sales.service.ts:38,166-167`.
- Finding: danh sách lỗi apply-promotion thiếu `409 SHIFT_NOT_OPEN`; remove-promotion (dòng 61) đã liệt kê mã này.
- Đề xuất sửa: thêm `SHIFT_NOT_OPEN` vào dòng 57 và grep lại `docs/api-spec.md`.

### B-10 — Test PB-02 chọn dòng refresh không lọc theo phiên (Low)
- Nguồn: review vòng 6, finding R6-6. Liên quan lần PB-02 fail ở lượt chạy khi sandbox DB lỗi (không tái hiện được trong lượt chạy 135/135).
- File:dòng: `POS_API/src/auth/tests/auth.integration.test.ts:190-191`.
- Finding: `SELECT revoked_at, replaced_at FROM refresh_tokens ORDER BY created_at LIMIT 1` lấy dòng sớm nhất toàn bảng; `created_at` là `DEFAULT now()` của transaction. Assertion có thể chọn nhầm dòng khi bảng có token của phiên khác. Reviewer chưa tái hiện được và không kết luận nguyên nhân.
- Đề xuất sửa: lọc theo `session_id` của phiên admin hoặc `token_hash` của cookie refresh; test tái hiện `[B-10] PB-02 rotated row is selected by session` với một dòng khác có `created_at` nhỏ hơn.

### B-11 — Event id trùng giữa hai test (Very Low)
- Nguồn: review vòng 6, finding R6-7.
- File:dòng: `POS_API/src/sales/tests/payment.integration.test.ts:1161,1221`.
- Finding: test `[R5-2]` dùng event id 6201 giống `test_ST6_transfer_amounts`; hai test độc lập nhờ R5-2 trả 503 nhưng phụ thuộc ngầm.
- Đề xuất sửa: đổi `[R5-2]` sang id riêng (ví dụ 6299); giữ nguyên assertion.

### B-12 — Thông báo PROMOTION_NOT_APPLICABLE không thống nhất (Very Low)
- Nguồn: review vòng 6, finding R6-8.
- File:dòng: `POS_API/src/sales/transfer-attempts.service.ts:149`; các chỗ khác `sales.service.ts:205,242,277,301`, `transfer-attempts.service.ts:85`.
- Finding: thông báo ở dòng 149 thiếu "Đổi hoặc bỏ mã để thanh toán.", khác bốn chỗ còn lại.
- Đề xuất sửa: thống nhất chuỗi thông báo; không đổi mã lỗi. Test tái hiện có thể là assertion message, hoặc ghi "không áp dụng test tái hiện" và nêu lệnh kiểm `grep`.

### B-13 — Case test webhook còn thiếu (Low)
- Nguồn: task `20261109-sprint08-payment`, review vòng 4, mục "Case test thiếu".
- Thiếu test cho: (a) timestamp lệch +301 giây phải 400; (b) body đổi nhưng giữ chữ ký cũ phải 401; (c) chữ ký sai định dạng phải 401.
- Đề xuất: thêm ba subtest `[B-13] ...` trong nhóm ST-6, dùng cùng helper ký HMAC; kiểm DB không đổi.

### B-14 — Case test hủy lượt QR còn thiếu (Low)
- Nguồn: review vòng 4, mục "Case test thiếu".
- Thiếu test: hủy lượt QR của người không đủ quyền phải 403; hủy khi ca đã đóng phải 409 `SHIFT_NOT_OPEN` (theo `specs/invoices.md` mục hủy lượt).
- Đề xuất: thêm subtest `[B-14] ...` trong `payment.integration.test.ts`; kiểm trạng thái attempt và invoice trước/sau.

### B-15 — Case test khuyến mãi hết lượt với hai đơn chờ QR (Low)
- Nguồn: review vòng 4, mục "Case test thiếu".
- Thiếu test: khi mã còn một lượt và hai đơn cùng chờ QR, chỉ một đơn được thanh toán; đơn còn lại giữ OPEN và báo ngoại lệ.
- Đề xuất: thêm subtest `[B-15] ...`, kiểm `used_count` và số payment.

### B-16 — Test HTTP phạm vi chi nhánh cho paymentPreview và createTransferAttempt (Low)
- Nguồn: review vòng 5, mục "Case test thiếu" (B-2).
- Hiện đã có test cho helper `invoice()` (`[B-2]`) nhưng chưa có test HTTP đi qua `paymentPreview` và `createTransferAttempt`.
- Đề xuất: thêm hai subtest `[B-16] ...`: người không `access_all` với `branchId` rỗng hoặc chi nhánh khác nhận 404.

### B-17 — Preview và form không đổi theo lượt QR mới (Low)
- Nguồn: task `20261109-sprint08-payment`, review vòng 8, finding R8-1.
- File:dòng: `POS_UI/src/features/pos/LivePaymentDialog.tsx:40,81,97-102`.
- Finding: khi poll chuyển sang lượt khác, `preview` không được tải lại, form xác nhận thủ công giữ dữ liệu cũ. Server vẫn chặn đúng (422 `TRANSFER_AMOUNT_INSUFFICIENT`), không sai tiền.
- Đề xuất: khi đổi lượt, gọi `load()` và reset `manual`, `ref`, `received`, `reason`; test `[B-17] attempt switch reloads preview and clears manual form`.

### B-18 — Tài liệu VietQR ghi "dự kiến" (Very Low, tài liệu)
- Nguồn: review vòng 8, finding R8-2.
- File:dòng: `THIRD_PARTY_INTEGRATIONS.md:21`; code `POS_API/src/sales/transfer-attempts.service.ts:38`.
- Đề xuất: đổi thành "đã triển khai" và dẫn tới file service. Không có test tái hiện; kiểm bằng `grep -n "dự kiến" THIRD_PARTY_INTEGRATIONS.md`.

### B-19 — Regex bỏ dấu `/` cuối không khớp router (Very Low)
- Nguồn: review vòng 8, finding R8-3.
- File:dòng: `POS_API/src/http/api-error.filter.ts:51`.
- Finding: `/\/+$/` bỏ mọi dấu `/` cuối; Express chỉ nhận một. `POST .../webhook//` không ký trả 401 trong khi route không tồn tại (404 với JSON hợp lệ).
- Đề xuất: đổi thành `/\/$/`; test `[B-19] double trailing slash is not treated as webhook` (mong đợi 400 `BAD_REQUEST`).

### B-20 — Spec thiếu 409 CONFLICT của tạo lượt QR (Very Low, tài liệu)
- Nguồn: review vòng 8, finding R8-4.
- File:dòng: `specs/invoices.md:85`; code `POS_API/src/sales/transfer-attempts.service.ts:98`.
- Đề xuất: thêm `409 CONFLICT` vào danh sách lỗi của POST transfer-attempts. Không có test; kiểm bằng `grep -n "CONFLICT" specs/invoices.md`.

### B-21 — Lỗi tải lại preview khi đổi lượt QR bị nuốt (Low)
- Nguồn: task `20261109-sprint08-payment`, review vòng 9, finding R9-1.
- File:dòng: `POS_UI/src/features/pos/LivePaymentDialog.tsx:40`.
- Finding: `void load().catch(e=>{if(active&&live.current)setError(message(e));})`. Effect cleanup đặt `active=false` khi `attempt?.id` đổi, nên `setError` không bao giờ chạy. Dialog vẫn hiện số tiền của lượt cũ mà không báo lỗi. Server vẫn chặn đúng (422), không sai tiền.
- Đề xuất: trong catch chỉ kiểm `live.current`; test `[B-21] reload error on attempt switch is shown` (poll đổi a1 sang a2, `paymentPreview` ném `NETWORK_ERROR`, kỳ vọng `role="alert"` hiện). Cập nhật file lỗi `20261110-payment-preview-stale-after-attempt-switch.md` (hiện ghi sai là lỗi hiện qua `setError`).

### B-22 — Timestamp +301 giây chập chờn (Low)
- Nguồn: review vòng 9, finding R9-2. File: `POS_API/src/sales/tests/payment.integration.test.ts:1433`; service `sepay-webhook.service.ts:18` (cửa sổ 300 giây).
- Finding: test gửi `now+301`; nếu request tới khi đã sang giây kế tiếp, độ lệch đúng bằng 300 và webhook có thể nhận 200. Ca −301 không bị ảnh hưởng.
- Đề xuất: đổi thành +302 và ghi lý do trong comment.

### B-23 — Thiếu ca 403 khi hủy lượt QR (Low)
- Nguồn: review vòng 9, finding R9-3 (backlog B-14 yêu cầu ca này). File:dòng: `payment.integration.test.ts:166`; code `transfer-attempts.service.ts:105`, `transfer-attempts.controller.ts:50`.
- Đề xuất: thêm test `[B-23] cancel QR without branch assignment returns 403` (user `b16_nobranch`) và một ca thiếu `pos.sell` → 403 `PERMISSION_DENIED`, attempt và invoice không đổi.

### B-24 — Event id 7501 trùng và phụ thuộc DELETE (Low)
- Nguồn: review vòng 9, finding R9-4. File:dòng: `payment.integration.test.ts:229,232,237` (trùng `[V3-2]` ở ~dòng 377; `test_ST7_exception_visibility` ~317, 321).
- Đề xuất: dùng id riêng (ví dụ 7551, 7552); bỏ DELETE nếu các assert đếm vẫn đúng, hoặc ghi lý do giữ. Kiểm: `grep -n "7501" payment.integration.test.ts` còn một chỗ.

### B-25 — Nhãn ngày sai (Very Low, tài liệu)
- Nguồn: review vòng 9, finding R9-5. File:dòng: `THIRD_PARTY_INTEGRATIONS.md:3`.
- Đề xuất: đổi nhãn "Trạng thái (09/11/2026)" thành ngày khớp nội dung (10/11/2026). Không có test; kiểm bằng đọc dòng 3.

### B-26 — Test B-23 phụ thuộc thứ tự chạy (Low)
- Nguồn: review vòng 10, R10-1. File:dòng: `payment.integration.test.ts:203-204` (user `b16_nobranch` tạo trong `[B-16]`).
- Đề xuất: đưa việc tạo user lên khối khởi tạo chung; kiểm bằng chạy riêng `--test-name-pattern "B-23"`.

### B-27 — Ca thiếu pos.sell của B-23 (Low)
- Nguồn: review vòng 10, R10-2. File:dòng: `payment.integration.test.ts:203-210`; `transfer-attempts.controller.ts:50` (`@RequirePermission('pos.sell')`); quyền đọc động (`auth.integration.test.ts:380-382`).
- Đề xuất: trong test, tạm `DELETE FROM role_permissions` cho cặp CASHIER và `pos.sell`, gọi cancel, kiểm 403 `PERMISSION_DENIED` và attempt/invoice không đổi; khôi phục trong `finally`.

### B-28 — README trạng thái lỗi thời (Low, tài liệu)
- Nguồn: review vòng 10, R10-3. File:dòng: `README.md:10,13,41`.
- Đề xuất: cập nhật câu trạng thái theo các màn đã gọi API thật (`LivePosScreen.tsx`, `LivePaymentDialog.tsx`). Cần user duyệt trước khi sửa (sync-docs). Kiểm: `grep -n "mô phỏng\|demo" README.md`.

### B-30 — Lỗi số tài khoản phía client không gắn vào ô (Low)
- Nguồn: review vòng 11, R11-1. File:dòng: `POS_UI/src/features/settings/SettingsScreen.tsx:104-106`.
- Finding: lỗi regex 6..19 chữ số đi vào `bankError` chung; `return` ở dòng 104 chạy trước khi reset `bankAccountError` (dòng 106), nên lỗi server cũ có thể còn hiện cùng lúc.
- Đề xuất: đặt lỗi client vào `bankAccountError`; reset cả `bankError` và `bankAccountError` đầu `saveBank`; test `[B-30] client-side account number error is attached to its field` (không gọi `update`, `aria-invalid='true'`, không còn thông điệp ở alert chung).

### B-31 — Test B-29 không phân biệt được chỗ hiện lỗi (Very Low)
- Nguồn: review vòng 11, R11-2. File:dòng: `POS_UI/test/organization-screen.test.mjs:120,131`.
- Finding: thông điệp detail trùng chuỗi fallback và assert bằng `screen.text()` toàn màn hình.
- Đề xuất: đổi thông điệp detail sang chuỗi khác fallback; assert text của `#bank-account-error`; test `[B-31]` kiểm không có alert chung.

### B-32 — README: màn Hóa đơn vẫn mô phỏng (Low, tài liệu)
- Nguồn: review vòng 12, R12-1. File:dòng: `README.md:10`.
- Finding: README nói màn Hóa đơn đã nối API thật, nhưng màn Hóa đơn vẫn dùng `mockStorage`/`MockEngine` (`POS_UI/src/features/invoices/InvoicesScreen.tsx:3-4,33`, `invoiceService.ts:16`, `InvoiceDetailDrawer.tsx:37`); Báo cáo mô phỏng (`reportService.ts:1`, `DailyReportScreen.tsx:6-7`).
- Đề xuất: sửa dòng 10 để ghi màn Hóa đơn và Báo cáo còn dữ liệu mô phỏng; kho chỉ mô phỏng ở tab lịch sử biến động (`StockMovementsTab.tsx:8`). Không có test; kiểm: `rg -l "mockStorage|MockEngine" POS_UI/src/features`.

### B-33 — README: bảng module thiếu bán hàng và kho (Low, tài liệu)
- Nguồn: review vòng 12, R12-2. File:dòng: `README.md:9`.
- Finding: bảng "Đã có trong mã" chưa liệt kê bán hàng/thanh toán (Sprint 08) và kho/khuyến mãi (Sprint 07), mâu thuẫn với dòng 13.
- Đề xuất: thêm bán hàng/thanh toán và kho/khuyến mãi vào dòng 9 theo module thật trong `POS_API/src/` (`sales`, `inventory`, `promotions`). Không có test; kiểm: `ls POS_API/src`.

### B-34 — Thiếu test bảo vệ việc xóa lỗi đầu saveBank (Low)
- Nguồn: review vòng 12, R12-3. File:dòng: `POS_UI/src/features/settings/SettingsScreen.tsx:104`.
- Finding: bỏ dòng reset đầu `saveBank` thì `[B-30]` vẫn xanh.
- Đề xuất: test `[B-34] stale bank errors cleared on client-side validation` trong `POS_UI/test/organization-screen.test.mjs`: (1) `update` trả 422 `accountNumber`, rồi BIN rỗng và bấm lưu → không còn `#bank-account-error`, có alert BIN; (2) `update` ném lỗi chung `QA 500`, rồi nhập 20 chữ số và bấm lưu → không còn chữ "QA 500".

### B-35 — Code reset trùng và test gần trùng (Very Low)
- Nguồn: review vòng 12, R12-4. File:dòng: `SettingsScreen.tsx:107`; `organization-screen.test.mjs:137-152`.
- Đề xuất: bỏ phần reset lỗi trùng ở dòng 107 (giữ `setBankBusy(true)`) sau khi xác nhận dòng 104 đủ; gộp assert "chỉ hiện một lần" vào `[B-29]` hoặc giữ `[B-31]` riêng. Refactor dưới test xanh.

### B-36 — File lỗi bank account lỗi thời (Very Low, tài liệu lỗi)
- Nguồn: review vòng 13, R13-1. File:dòng: `.devloopflow/errors/20261110-bank-account-error-not-attached-to-field.md:33`.
- Finding: file ghi test `[B-31]` theo tên cũ (đã gộp thành `[B-29][B-31] account number error is attached to its field and shown once` trong `POS_UI/test/organization-screen.test.mjs`), và chưa ghi B-34 (test hồi quy dòng 104 `SettingsScreen.tsx`) và B-35 (bỏ reset lặp dòng 107).
- Đề xuất: thêm mục cập nhật ghi tên test mới, test `[B-34]` và kết quả đột biến dòng 104. Không có test tái hiện (tài liệu); kiểm: `rg -n "B-31|B-34" .devloopflow/errors/20261110-bank-account-error-not-attached-to-field.md`.

### B-29 — Lỗi số tài khoản không gắn field (Very Low)
- Nguồn: review vòng 10, R10-4. File:dòng: `POS_UI/src/features/settings/SettingsScreen.tsx:273-275`.
- Đề xuất: gắn lỗi vào ô "Số tài khoản" (`aria-invalid`, `aria-describedby`) và ánh xạ `details.field` của lỗi 422 về đúng field. Căn cứ plan ST-8.AC-2.

### B-37 — found_by và thiếu dòng Test tái hiện trong 3 file lỗi mới (Very Low, tài liệu lỗi)
- Nguồn: review vòng 17, R17-1. File:dòng: `.devloopflow/errors/20261111-pay-then-next-order-path-untested.md:4`, `20261111-manager-cancel-open-behavior-untested.md:4`, `20261111-plan-spec-missing-manager-cancel-decision.md:4`.
- Finding: `found_by: review` không thuộc giá trị template (`code-reviewer | ac-verifier | user`; 35 file khác dùng `code-reviewer`); mục "Cách fix" không có dòng `Test tái hiện: <path>::<tên test>` theo mẫu `record-error/templates/error.md` (tên test chỉ có trong văn xuôi).
- Đề xuất: đổi thành `found_by: code-reviewer`; thêm `Test tái hiện: POS_UI/test/live-payment.test.mjs::[PAID-DONE-9b]`, `POS_API/src/sales/tests/manager-cancel.integration.test.ts::[MGR-CANCEL-1..4]`; file R16-3 ghi "Test tái hiện: không áp dụng (tài liệu); kiểm bằng `diff` hai plan". Test tái hiện của finding: không áp dụng (hồ sơ); kiểm bằng grep `^found_by` trong `errors/` chỉ còn giá trị thuộc template.

### B-38 — Spec invoices nói QR chờ khóa cả thanh toán, code vẫn hiện nút (Low, lệch tài liệu)
- Nguồn: review vòng 17, R17-2. File:dòng: `specs/invoices.md:39`; `POS_UI/src/features/pos/LivePosScreen.tsx:248`.
- Finding: câu thêm ngày 11/11/2026 ghi chỉ đơn `OPEN` chưa có QR chờ mới thêm/sửa/xóa món, chuyển bàn, hủy hoặc thanh toán; nhưng `LivePosScreen.tsx:248` hiện nút "Thanh toán" khi `selected.status==='OPEN'&&(canWrite||canManual)`, không xét `pendingState`. Hành vi đó cần thiết (đường mở lại QR, hủy chờ, xác nhận thủ công); plan ST-8.AC-3(f) và `specs/invoices.md:25` chỉ khóa sửa đơn/mã.
- Đề xuất (cần user duyệt hướng): (a) bỏ "hoặc thanh toán" khỏi danh sách bị khóa, hoặc (b) giữ và ghi rõ "với QR chờ, nút Thanh toán chỉ mở lại QR/hủy chờ/xác nhận thủ công" (reviewer chưa chọn; agent chính đề xuất (b)). Test tái hiện: không áp dụng (tài liệu); kiểm: đối chiếu `specs/invoices.md:39` với `LivePosScreen.tsx:248` phải nhất quán.

### B-39 — Thông báo của đơn cũ không bị xóa khi chọn/tạo đơn mới (Low)
- Nguồn: review vòng 16, R16-4. File:dòng: `POS_UI/src/features/pos/LivePosScreen.tsx:122,209,255`.
- Finding: `notice` ("Thanh toán thành công.", "Đã hủy đơn.", "Đơn đã thanh toán hoặc đã đóng. Danh sách đã được làm mới.") chỉ bị xóa ở `:59` (đổi session) và `:249` (bấm Thanh toán); không bị xóa khi tạo hoặc chọn đơn mới qua `perform`, `openTable`, click danh sách. Thông báo của đơn A còn hiện khi thu ngân làm đơn B. Không sai dữ liệu (server vẫn chặn).
- Đề xuất: `setNotice('')` khi chọn/tạo đơn `OPEN` thành công. Test `[R16-4]`: sau `onPaid`, tạo đơn mang đi mới thì không còn "Thanh toán thành công.".

### B-40 — Thiếu assert phụ cho ST-8.AC-3 (a)/(c) (Low, test)
- Nguồn: review vòng 16, R16-5. File:dòng: `POS_UI/test/live-payment.test.mjs:332-361`.
- Finding: chưa assert riêng (1) "Chuyển bàn" ẩn với đơn DINE_IN không OPEN (cả `[PAID-DONE-1]` và `[PAID-DONE-4]` dùng TAKEAWAY); (2) nhánh `perform()` trả đơn PAID hiện "Đơn đã đóng." (`LivePosScreen.tsx:122`; chỉ nhánh CANCELLED có test); `[PAID-DONE-1]` gần trùng `[PAID-DONE-4]`.
- Đề xuất: đổi `[PAID-DONE-1]` sang đơn DINE_IN có `tableId`, kiểm `select[aria-label="Bàn đích"]` không tồn tại; thêm biến thể `updated.status='PAID'` kiểm "Đơn đã đóng." và "Chưa chọn đơn".

## Lịch sử trạng thái (chỉ thêm)
- 2026-11-11 (fix-backlog B-39, B-40, subagent `tdd` + agent chính kiểm lại, local): B-39 đã sửa — `POS_UI/src/features/pos/LivePosScreen.tsx` thêm `setNotice('')` khi chọn/tạo đơn OPEN (`perform`, `openTable`, click danh sách); test `[B-39]` ×4 đỏ trước, xanh sau. B-40 đã sửa — thêm test `[B-40]` ×2 (DINE_IN không OPEN không có Chuyển bàn; `perform` trả PAID → "Đơn đã đóng."), xanh ngay, đột biến làm đỏ. Kiểm: POS_UI `npm test` 85/85, typecheck và build exit 0. Errors: `.devloopflow/errors/20261111-stale-notice-and-missing-closed-order-asserts.md`. Chưa qua code-reviewer/verify-ac.
- 2026-11-11: thêm B-39 và B-40 từ review vòng 16 của task `20261109-sprint08-payment` (R16-4, R16-5) theo lựa chọn "đưa vào backlog" của user. Trạng thái ban đầu `chờ xử lý`; chưa đối chiếu lại dòng code, sẽ kiểm khi `fix-backlog`.
- 2026-11-11 (fix-backlog B-37, B-38; tài liệu nên không có test tái hiện, agent chính sửa trực tiếp): B-37 đã sửa — 3 file `.devloopflow/errors/20261111-{pay-then-next-order-path-untested,manager-cancel-open-behavior-untested,plan-spec-missing-manager-cancel-decision}.md` đổi `found_by: code-reviewer` và thêm dòng `Test tái hiện` (kiểm: `grep -h ^found_by .devloopflow/errors/*.md` chỉ còn code-reviewer 38, ac-verifier 3, user 1). B-38 đã sửa theo hướng (b) do agent chính đề xuất (user gọi fix-backlog B-38, không nêu hướng khác) — `specs/invoices.md:39` bỏ "hoặc thanh toán" khỏi danh sách bị khóa và ghi nút Thanh toán với QR chờ chỉ để mở lại QR/hủy chờ/xác nhận thủ công; code `LivePosScreen.tsx:248` giữ nguyên (khớp). Chưa qua code-reviewer/verify-ac.
- 2026-11-11: thêm B-37 và B-38 từ review vòng 17 của task `20261109-sprint08-payment` (R17-1, R17-2) theo yêu cầu "ghi vào backlog 2 finding low" của user. Trạng thái ban đầu `chờ xử lý`; chưa đối chiếu lại dòng code, sẽ kiểm khi `fix-backlog`. Cùng lúc, R16-4 và R16-5 (Low, review vòng 16) vẫn nằm ở "Finding hoãn" của task, chưa vào backlog.
- 2026-11-10: thêm B-7 đến B-12 từ review vòng 6 của task `20261109-sprint08-payment` (đọc bù), theo lựa chọn "đưa vào backlog" của user ở bước 10 của `run`. Trạng thái ban đầu `chờ xử lý`. Các mục R6-3..R6-8 vẫn đúng với code tại thời điểm review; chưa đối chiếu lại dòng code, sẽ kiểm khi `fix-backlog`.
- 2026-11-10 (fix-backlog B-7..B-12, subagent `tdd` + agent chính kiểm lại): B-7 đã sửa — `POS_API/src/sales/transfer-attempts.service.ts` (chuẩn hóa `attemptId` về chữ thường), test `[B-7]` trong `payment.integration.test.ts`; errors `.devloopflow/errors/20261110-backlog-manual-confirm-replay-uppercase-uuid.md`. B-8 đã sửa tài liệu — `docs/api-spec.md:374` (thứ tự kiểm webhook); không có test (tài liệu), kiểm bằng `grep` và đọc `sepay-webhook.service.ts:14-24`; không tạo errors/ vì là tài liệu. B-9 đã sửa tài liệu — `specs/invoices.md:57` (thêm `409 SHIFT_NOT_OPEN`); kiểm bằng `grep`; không tạo errors/. B-10 đã sửa test — `POS_API/src/auth/tests/auth.integration.test.ts` (chọn dòng refresh theo `token_hash` và kiểm `oldRows.length===1`); không đổi hành vi sản phẩm; Red với assertion cũ đã thấy. B-11 đã sửa test — `[R5-2]` đổi event id 6201 sang 6299 (`payment.integration.test.ts:~1180`); không đổi hành vi. B-12 đã sửa thông báo — `POS_API/src/sales/transfer-attempts.service.ts:~150` dùng chuỗi chuẩn "Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán."; test `[B-12]` trong `payment.integration.test.ts`; mã lỗi không đổi; không tạo errors/ vì là thay đổi thông báo. Kiểm chứng agent chính (chạy lại, lượt này): API `npm run build` exit 0; `npm test` 137/137 pass, exit 0 (sandbox PostgreSQL local, chưa có CI độc lập). Không chạm UI. Chưa qua `code-reviewer` hay `verify-ac`; chưa commit.
- 2026-11-10 (fix-backlog B-21..B-25, subagent `tdd` + agent chính kiểm lại): B-21 đã sửa — `POS_UI/src/features/pos/LivePaymentDialog.tsx:40` (bỏ `active` trong catch); test `[B-21]` đỏ trước, xanh sau; errors `.devloopflow/errors/20261110-payment-preview-reload-error-swallowed.md`. B-22 đã sửa test — `payment.integration.test.ts` +301 → +302 (test `[B-13]`); xanh trước và sau. B-23 đã sửa một phần — test `[B-23]` (`b16_nobranch`, 403, DB không đổi) xanh ngay, chứng minh bằng đột biến tạm ở `transfer-attempts.service.ts:105` (fail, khôi phục, xanh); ca thiếu `pos.sell` chưa dựng được. Lý do ghi trước đó (các role seed đều có `pos.sell`) là SAI: review vòng 10 (R10-2) xác định `pos.sell` đọc động từ `role_permissions`, có thể gỡ trong test; ca này còn mở, xem mục chờ quyết trong task file. B-24 đã sửa test — ca B-15 đổi sang 7551/7552; giữ DELETE vì `test_ST7_exception_visibility` đếm mọi exception của chi nhánh (lý do ghi trong comment). B-25 đã sửa tài liệu — `THIRD_PARTY_INTEGRATIONS.md:3` đổi thành 10/11/2026. Kiểm agent chính (chạy lại): API build exit 0, `npm test` 148/148 pass, exit 0; UI typecheck exit 0, build exit 0, `npm test` 62/62 pass, exit 0 (local, sandbox PostgreSQL). Chưa qua `code-reviewer` hay `verify-ac`; chưa commit.
- 2026-11-10 (fix-backlog B-30, B-31, subagent `tdd` + agent chính kiểm lại): B-30 đã sửa — `POS_UI/src/features/settings/SettingsScreen.tsx:104-105` (lỗi regex vào `bankAccountError`, reset cả hai state đầu `saveBank`); test `[B-30]` trong `POS_UI/test/organization-screen.test.mjs` đỏ trước (`expected 'true'`), xanh sau; errors cập nhật `.devloopflow/errors/20261110-bank-account-error-not-attached-to-field.md`. B-31 đã sửa test — `[B-29]` đổi thông điệp chi tiết và assert trên `#bank-account-error`; `[B-31]` thêm, xanh ngay (hành vi đã có). Kiểm agent chính: UI typecheck exit 0, build exit 0, `npm test` 65/65 pass, exit 0 (local, chưa CI độc lập). B-28 (README) không sửa vì chưa được duyệt. Chưa qua `code-reviewer` hay `verify-ac`; chưa commit.
- 2026-11-10 (B-28, user duyệt "duyệt sửa b28"; tài liệu, không có test tái hiện): đã sửa `README.md:10,13,41` — mô tả màn bán hàng và thanh toán đã nối API thật từ Sprint 08 (kiểm trên local, chưa CI độc lập); kho và báo cáo giữ nguyên trạng thái mô phỏng/phạm vi. Kiểm: `grep -n "mô phỏng\|demo" README.md` cho các dòng đã đổi; không tạo errors/ vì là tài liệu.
- 2026-11-10: thêm B-36 từ review vòng 13 của task `20261109-sprint08-payment` (theo lựa chọn "đưa vào backlog" và "fix-backlog" của user). Trạng thái ban đầu `chờ xử lý`.
- 2026-11-10 (fix-backlog B-36, subagent `tdd`, không có test tái hiện vì là tài liệu): đã sửa `.devloopflow/errors/20261110-bank-account-error-not-attached-to-field.md` — thêm mục "Cập nhật (B-34, B-35 — review vòng 12/13)" và ghi chú tên test `[B-29][B-31]` mới. Agent chính kiểm bằng `rg` và đối chiếu tên test với `POS_UI/test/organization-screen.test.mjs:117,169`, dòng 104 và 107 của `SettingsScreen.tsx`: khớp.
- 2026-11-10 (fix-backlog B-32..B-35, subagent `tdd` + agent chính kiểm lại): B-34 đã sửa — test hồi quy `[B-34] stale bank errors cleared on client-side validation` trong `POS_UI/test/organization-screen.test.mjs`; xanh ngay; đột biến dòng 104 (bỏ cả dòng, hoặc chỉ giữ một trong hai reset) đều làm `[B-34]` đỏ, đã khôi phục. B-35 đã sửa (refactor) — bỏ reset lặp ở `SettingsScreen.tsx:107`; test `[B-31]` gộp vào `[B-29]`, vẫn xanh. B-32, B-33 đã sửa tài liệu `README.md` dòng 9 và 10; kiểm bằng `ls POS_API/src` và `rg "mockStorage|MockEngine" POS_UI/src/features`. Kiểm agent chính: UI typecheck exit 0, build exit 0, `npm test` 65/65 pass, exit 0 (local). Chưa qua `code-reviewer` hay `verify-ac`; chưa commit.
- 2026-11-10: thêm B-32 đến B-35 từ review vòng 12 của task `20261109-sprint08-payment` (theo lựa chọn "chuyển vào backlog" và "chạy fix-backlog" của user). Trạng thái ban đầu `chờ xử lý`. Lưu ý: R12-1 là lỗi chính của tôi trong sửa B-28 trước đó (README bỏ sót màn Hóa đơn).
- 2026-11-10: thêm B-30 và B-31 từ review vòng 11 của task `20261109-sprint08-payment` (theo lựa chọn "đưa vào backlog" của user). Trạng thái ban đầu `chờ xử lý`; chưa đối chiếu lại dòng code, sẽ kiểm khi `fix-backlog`.
- 2026-11-10 (fix-backlog B-26, B-27, B-29, subagent `tdd` + agent chính kiểm lại): B-26 đã sửa test — khởi tạo `b16_nobranch` lên khối chung (`payment.integration.test.ts` ~dòng 111); test `[B-23]` chạy riêng đỏ trước (401, user chưa tồn tại), xanh sau. B-27 đã sửa — thêm test `[B-27] cancel QR without pos.sell returns 403` (tạm xóa `role_permissions`, khôi phục trong `finally`); xanh ngay, đột biến `@RequirePermission('pos.sell')` tạm ở `transfer-attempts.controller.ts:50` làm test đỏ (`actual 204`), đã khôi phục và kiểm `SAME`. B-29 đã sửa — `POS_UI/src/features/settings/SettingsScreen.tsx` (state `bankAccountError`, `aria-invalid`/`aria-describedby`, `<p id="bank-account-error" role="alert">`); test `[B-29]` đỏ trước, xanh sau; errors `.devloopflow/errors/20261110-bank-account-error-not-attached-to-field.md`. Kiểm agent chính (chạy lại): API build exit 0, `npm test` 149/149 pass, exit 0; UI typecheck exit 0, build exit 0, `npm test` 63/63 pass, exit 0 (local, sandbox PostgreSQL). Không sửa B-28 (README) vì cần duyệt. Chưa qua `code-reviewer` hay `verify-ac`; chưa commit.
- 2026-11-10: thêm B-26 đến B-29 từ review vòng 10 của task `20261109-sprint08-payment` (theo lựa chọn "đưa vào backlog" của user). Trạng thái ban đầu `chờ xử lý`; chưa đối chiếu lại dòng code, sẽ kiểm khi `fix-backlog`.
- 2026-11-10: thêm B-21 đến B-25 từ review vòng 9 của task `20261109-sprint08-payment` (theo lựa chọn "chuyển vào backlog" của user). Trạng thái ban đầu `chờ xử lý`; chưa đối chiếu lại dòng code, sẽ kiểm khi `fix-backlog`. B-21 là lỗi thật trong B-17 — file lỗi `20261110-payment-preview-stale-after-attempt-switch.md` cần sửa cho khớp.
- 2026-11-10 (B-17, theo quyết định user: chỉ tải lại số tiền, giữ form): đã sửa — `POS_UI/src/features/pos/LivePaymentDialog.tsx:40` (thêm `load()` khi đổi lượt), test `[B-17]` trong `POS_UI/test/live-payment.test.mjs` (đỏ trước: `preview must be reloaded`); errors `.devloopflow/errors/20261110-payment-preview-stale-after-attempt-switch.md`. Kiểm agent chính: UI typecheck exit 0, build exit 0, test 61/61 pass, exit 0 (local). Chưa qua `code-reviewer` hay `verify-ac`; chưa commit.
- 2026-11-10 (fix-backlog B-13..B-20, subagent `tdd` + agent chính kiểm lại): B-13, B-14, B-15, B-16 đã sửa bằng test thêm vào `POS_API/src/sales/tests/payment.integration.test.ts` (không đổi code; đột biến tạm đã khôi phục, chỉ B-13 có đột biến đỏ rõ ràng); B-18 đã sửa tài liệu `THIRD_PARTY_INTEGRATIONS.md:21`; B-19 đã sửa `POS_API/src/http/api-error.filter.ts:51` (`/\/$/`), test `[B-19]` đỏ trước (401 !== 400), xanh sau; errors `.devloopflow/errors/20261110-webhook-double-trailing-slash.md`; B-20 đã sửa tài liệu `specs/invoices.md:85`. B-17 **chưa sửa**: xung đột với test `[R7-2]` (`live-payment.test.mjs:239` bấm xác nhận trên a2 ngay sau khi đổi lượt, test này chủ ý giữ form mở); cần user quyết (xóa form hay chỉ tải lại preview). Kiểm chứng agent chính: API build exit 0, `npm test` 147/147 pass; UI typecheck exit 0, build exit 0, test 60/60 pass (local, sandbox PostgreSQL, chưa CI độc lập). Chưa qua `code-reviewer` hay `verify-ac`; chưa commit.
- 2026-11-10: thêm B-17 đến B-20 từ review vòng 8 của task `20261109-sprint08-payment` (theo lựa chọn "đưa vào backlog" của user). Trạng thái ban đầu `chờ xử lý`; chưa đối chiếu lại dòng code, sẽ kiểm khi `fix-backlog`.
- 2026-11-10: thêm B-13 đến B-16 — các finding Low "case test thiếu" từ review vòng 4 và vòng 5 chưa được ghi vào backlog (task `20261109-sprint08-payment`). Trạng thái ban đầu `chờ xử lý`; chưa đối chiếu lại dòng code, sẽ kiểm khi `fix-backlog`.
- 2026-11-10 (fix-backlog, subagent `tdd` + kiểm lại bởi agent chính): B-1 đã sửa — `POS_UI/src/features/pos/LivePaymentDialog.tsx` (hàm `release()`), test `POS_UI/test/live-payment.test.mjs::[B-1]` ×3; errors `.devloopflow/errors/20261110-backlog-payment-dialog-stuck-uncertain.md`. B-2 đã sửa — `POS_API/src/sales/transfer-attempts.service.ts:24`, `POS_API/src/sales/sales.service.ts:46` (bỏ vế `&& user.branchId`), test `[B-2]` trong `POS_API/src/sales/tests/payment.integration.test.ts`; errors `.devloopflow/errors/20261110-backlog-branch-scope-null-branchid-fail-open.md`. B-3 đã sửa theo quyết định user (phương án a: 409 `INVOICE_NOT_OPEN`) — `POS_API/src/sales/sales.service.ts` (hàm `paymentPreview`), test `[B-3]`; errors `.devloopflow/errors/20261110-backlog-payment-preview-non-open-invoice.md`. B-4 đã sửa — `POS_API/src/auth/auth-config.ts` (ngưỡng 32 byte), test `[B-4]` trong `POS_API/src/auth/tests/auth-config.test.ts`; đổi fixture `payment.integration.test.ts` dòng ~95 từ 31 sang 33 byte theo đồng ý của user; errors `.devloopflow/errors/20261110-backlog-sepay-secret-minimum-length.md`. Kiểm chứng agent chính (chạy lại): API `npm run build` exit 0, `npm test` 132/132 pass, exit 0; UI `npm run typecheck` exit 0, `npm run build` exit 0, `npm test` 57/57 pass, exit 0 (local, sandbox PostgreSQL `pos_sprint08_test_pg`, chưa có CI độc lập). B-5 đã sửa theo duyệt của user — `AGENTS.md:29`, `CLAUDE.md:29` cập nhật trạng thái SePay Test mode (chưa kiểm Live); không tạo errors/ vì là sửa tài liệu, không phải lỗi code; `THIRD_PARTY_INTEGRATIONS.md:3,10,12` chưa được sửa trong mục này (cần sync-docs riêng). B-6 đã sửa theo lựa chọn của user — thêm `graphify-out/` vào `POS_API/.gitignore`; `git check-ignore` xác nhận; không tạo errors/ vì là cấu hình. Chưa qua `code-reviewer` hay `verify-ac`; chưa commit.
- 2026-11-10: ghi B-1 đến B-6 từ task `20261109-sprint08-payment` theo lựa chọn "đưa vào backlog" của user ở bước 10 của `run`. Trạng thái ban đầu `chờ xử lý`. Đã đối chiếu `AGENTS.md:29`, `CLAUDE.md:29`, `POS_API/src/auth/auth-config.ts:16-19`, `POS_API/src/sales/transfer-attempts.service.ts:24`, `POS_API/src/sales/sales.service.ts:46,321-323` và `git status` (`?? POS_API/graphify-out/`) trước khi ghi; B-1 chưa đối chiếu lại dòng code, sẽ kiểm khi `fix-backlog`.
- 2026-11-11 (xử lý V12-1 theo yêu cầu user "fix v12-1"): ghi file `errors/` cho nhóm lỗi chất lượng test đã sửa: B-22 → `errors/20261110-webhook-timestamp-boundary-flaky.md`; B-23, B-27 → `errors/20261110-cancel-qr-forbidden-cases-missing.md`; B-26 → `errors/20261110-test-order-dependency-b16-user.md`; B-24 → bổ sung "Cập nhật (B-24)" vào `errors/20261110-payment-test-event-id-collision.md`. B-25, B-32, B-33 là sửa tài liệu (`THIRD_PARTY_INTEGRATIONS.md:3`, `README.md:9,10`), không có test tái hiện; không tạo `errors/` theo cách đã áp dụng cho B-28 (dòng 2026-11-10 "tài liệu, không có test tái hiện"). Lý do miễn này do agent chính áp dụng theo tiền lệ B-28; cần user xác nhận hoặc yêu cầu bổ sung file.

### B-41 — R1-2 [Low]
- Task nguồn: 20261112-sprint09-drawer-cancel-invoices (`.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md`)
- File:dòng: POS_API/src/sales/tests/cancel-paid.integration.test.ts:188-192
- Finding (nguyên văn của reviewer/tdd/ac-verifier): Fixture TRANSFER (`seedPaidTransfer`) ghi dòng `SALE` với `created_by = cashierId, source 'USER'`; đơn TRANSFER thật do webhook hoàn tất ghi `SALE` với `actorId=null`, tức `created_by NULL, source 'SYSTEM'` (`sales.service.ts:320-321`, `sepay-webhook.service.ts:82`). ST-4.AC-8 và ST-5.AC-3 chưa phủ đúng dạng dữ liệu thật; code vẫn đúng vì `SALE_REVERSAL` luôn lấy `user.id` và `'USER'`.
- Căn cứ và đề xuất sửa: Seed `SALE` dạng SYSTEM rồi assert `SALE_REVERSAL` có `created_by = managerId, source 'USER'`.
- Test tái hiện đề xuất: `[R1-2] reversal of SYSTEM-sourced SALE is attributed to the canceller` | input: như ST-4.AC-8 nhưng `SALE` dạng SYSTEM | mong đợi: 200, 1 dòng `SALE_REVERSAL` `+100.000`, `created_by=managerId`, `source='USER'`
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — chờ xử lý — user chọn "Đưa hết vào backlog" ở bước 10 của task 20261112-sprint09-drawer-cancel-invoices; 2026-11-13 — đã sửa — fix-backlog `tất cả` (tdd, sonnet): test `[B-41]` (khoảng trống test, xanh ngay; đột biến chép created_by/source từ SALE → đỏ); build + `npm test` 204/204 (agent chính chạy lại); file errors `.devloopflow/errors/20261113-sprint09-test-gaps-money-and-concurrency.md`; chưa qua code-reviewer

### B-42 — R1-3 [Low]
- Task nguồn: 20261112-sprint09-drawer-cancel-invoices (`.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md`)
- File:dòng: POS_API/src/sales/sales.service.ts:446,457
- Finding (nguyên văn của reviewer/tdd/ac-verifier): Plan có dòng edge case "Người không có `branchId`, không `access_all` → 404 `NOT_FOUND` từ `invoice()`" cho nhánh `PAID`, nhưng chưa có test. `invoice()` đã chặn khi thiếu `branchId` từ lỗi B-2, nên rủi ro thấp.
- Căn cứ và đề xuất sửa: Thêm test HTTP.
- Test tái hiện đề xuất: `[R1-3] manager with NULL branch cannot cancel PAID` | input: MANAGER `branch_id=NULL` hủy đơn `PAID` chi nhánh A | mong đợi: 404 `NOT_FOUND`, `snapshot` không đổi
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — chờ xử lý — user chọn "Đưa hết vào backlog" ở bước 10 của task 20261112-sprint09-drawer-cancel-invoices; 2026-11-13 — đã sửa — fix-backlog `tất cả` (tdd, sonnet): test `[B-42]` (khoảng trống test; đột biến bỏ vế NULL của `invoice()` → đỏ); build + `npm test` 204/204 (agent chính chạy lại); file errors `.devloopflow/errors/20261113-sprint09-test-gaps-money-and-concurrency.md`; chưa qua code-reviewer

### B-43 — R1-4 [Low]
- Task nguồn: 20261112-sprint09-drawer-cancel-invoices (`.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md`)
- File:dòng: POS_API/src/shifts/http/shifts.dto.ts:72
- Finding (nguyên văn của reviewer/tdd/ac-verifier): `@ApiProperty` của `reason` khai báo trường bắt buộc, nhưng validator dùng `@IsOptional()`. Swagger nói khác hành vi thật (thiếu `reason` trả `EXPENSE_REASON_REQUIRED`, không phải `VALIDATION_ERROR`). Mẫu `CancelInvoiceDto` cũng vậy.
- Căn cứ và đề xuất sửa: Đổi sang `@ApiPropertyOptional`, giữ mô tả.
- Test tái hiện đề xuất: Không áp dụng (chỉ tài liệu Swagger); lệnh kiểm thay thế: mở `/api/docs` ở development
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — chờ xử lý — user chọn "Đưa hết vào backlog" ở bước 10 của task 20261112-sprint09-drawer-cancel-invoices; 2026-11-13 — đã sửa — fix-backlog `tất cả` (tdd, sonnet): không đổi hành vi: `@ApiPropertyOptional`; test bảo vệ ST-2.AC-4 xanh trước và sau; build + `npm test` 204/204 (agent chính chạy lại); file errors `.devloopflow/errors/20261113-sprint09-dto-docs-and-format-nits.md`; chưa qua code-reviewer

### B-44 — R1-5 [Very Low]
- Task nguồn: 20261112-sprint09-drawer-cancel-invoices (`.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md`)
- File:dòng: POS_API/src/sales/tests/cancel-paid.integration.test.ts:193; POS_API/src/shifts/http/shifts.response.ts:43-44
- Finding (nguyên văn của reviewer/tdd/ac-verifier): `return invoice;` thụt lề sai (8 khoảng thay vì 6). `shifts.response.ts:43-44` có hai dòng trống liên tiếp.
- Căn cứ và đề xuất sửa: Sửa định dạng.
- Test tái hiện đề xuất: Không áp dụng: không đổi hành vi
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — chờ xử lý — user chọn "Đưa hết vào backlog" ở bước 10 của task 20261112-sprint09-drawer-cancel-invoices; 2026-11-13 — đã sửa — fix-backlog `tất cả` (tdd, sonnet): không đổi hành vi: sửa định dạng; test xanh trước và sau; build + `npm test` 204/204 (agent chính chạy lại); file errors `.devloopflow/errors/20261113-sprint09-dto-docs-and-format-nits.md`; chưa qua code-reviewer

### B-45 — ST2-M1 [Very Low]
- Task nguồn: 20261112-sprint09-drawer-cancel-invoices (`.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md`)
- File:dòng: POS_API/src/shifts/shifts.service.ts (listExpenses, ORDER BY e.created_at DESC, e.id DESC)
- Finding (nguyên văn của reviewer/tdd/ac-verifier): Report `tdd` ST-2: đổi tiebreak `e.id DESC` thành `ASC` không test nào đỏ vì `created_at` luôn khác nhau giữa các INSERT tuần tự.
- Căn cứ và đề xuất sửa: Thêm test hai khoản chi cùng `created_at` (INSERT SQL cùng `now()` trong một transaction) kiểm thứ tự theo `id DESC`.
- Test tái hiện đề xuất: `expense list breaks created_at ties by id DESC` | input: 2 dòng `shift_expenses` cùng `created_at` | mong đợi: GET trả dòng `id` lớn hơn trước
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — chờ xử lý — user chọn "Đưa hết vào backlog" ở bước 10 của task 20261112-sprint09-drawer-cancel-invoices; 2026-11-13 — đã sửa — fix-backlog `tất cả` (tdd, sonnet): test `[B-45]` (đột biến `e.id ASC` → đỏ); build + `npm test` 204/204 (agent chính chạy lại); file errors `.devloopflow/errors/20261113-sprint09-test-gaps-money-and-concurrency.md`; chưa qua code-reviewer

### B-46 — ST2-M2 [Very Low]
- Task nguồn: 20261112-sprint09-drawer-cancel-invoices (`.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md`)
- File:dòng: POS_API/src/shifts/shifts.service.ts (addExpense, `input.reason?.trim()`)
- Finding (nguyên văn của reviewer/tdd/ac-verifier): Report `tdd` ST-2: bỏ `.trim()` ở service là đột biến tương đương (DTO đã trim); bước trim ở service chỉ phòng thủ.
- Căn cứ và đề xuất sửa: Bỏ `.trim()` thừa hoặc giữ làm phòng thủ có chú thích; không đổi hành vi.
- Test tái hiện đề xuất: Không áp dụng: không đổi hành vi
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — chờ xử lý — user chọn "Đưa hết vào backlog" ở bước 10 của task 20261112-sprint09-drawer-cancel-invoices; 2026-11-13 — đã sửa — fix-backlog `tất cả` (tdd, sonnet): không đổi hành vi: bỏ `?.trim()` thừa; ST-2.AC-1/AC-4 xanh trước và sau; build + `npm test` 204/204 (agent chính chạy lại); file errors `.devloopflow/errors/20261113-sprint09-dto-docs-and-format-nits.md`; chưa qua code-reviewer

### B-47 — ST5-M1 [Low]
- Task nguồn: 20261112-sprint09-drawer-cancel-invoices (`.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md`)
- File:dòng: POS_API/src/shifts/shifts.service.ts:83 (cashSales)
- Finding (nguyên văn của reviewer/tdd/ac-verifier): Report `tdd` ST-5: đột biến bỏ `p.method='CASH'` trong `cashSales` không test nào bắt; lần chạy riêng 21/21 xanh. Trong fixture, đơn TRANSFER đã hủy nên không còn `PAID` để tính.
- Căn cứ và đề xuất sửa: Thêm test đóng ca có đơn TRANSFER `PAID` còn nguyên (không hủy) và đơn CASH, kiểm `cashSalesAmount` chỉ gồm CASH.
- Test tái hiện đề xuất: `close shift counts only CASH payments in cash_sales_amount` | input: opening 100000, CASH PAID 50000, TRANSFER PAID 30000 giữ nguyên, đóng `countedCash 150000` | mong đợi: `cashSalesAmount 50000`, `expectedCash 150000`, `MATCHED`
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — chờ xử lý — user chọn "Đưa hết vào backlog" ở bước 10 của task 20261112-sprint09-drawer-cancel-invoices; 2026-11-13 — đã sửa — fix-backlog `tất cả` (tdd, sonnet): test `[B-47]` (đột biến bỏ `p.method='CASH'` → đỏ); build + `npm test` 204/204 (agent chính chạy lại); file errors `.devloopflow/errors/20261113-sprint09-test-gaps-money-and-concurrency.md`; chưa qua code-reviewer

### B-48 — R2-N1 [Low]
- Task nguồn: 20261112-sprint09-drawer-cancel-invoices (`.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md`)
- File:dòng: POS_API/src/sales/sales.service.ts (cancelPaid) và payCash
- Finding (nguyên văn của reviewer/tdd/ac-verifier): Review vòng 2: `cancelPaid` giữ khóa ca rồi chèn `stock_movements` (khóa FK `KEY SHARE` lên `branches`); `payCash` khóa `FOR UPDATE OF s,b`. Hai thao tác chỉ deadlock nếu PostgreSQL khóa `b` trước `s`. Mẫu này đã có ở webhook và xác nhận thủ công; không test nào cho cặp này chạy đồng thời.
- Căn cứ và đề xuất sửa: Thêm test đồng thời dùng `gate` + `waitLock` (hoặc `pg_blocking_pids`) cho một đơn `OPEN` đang thanh toán CASH và một đơn `PAID` đang hủy cùng ca.
- Test tái hiện đề xuất: `concurrent payCash and PAID cancel in one shift do not deadlock` | input: gate giữ khóa ca; gửi `POST /payments` CASH cho đơn A và `POST /cancel` cho đơn B (PAID) | mong đợi: cả hai hoàn tất (200/201), không timeout, `SELECT` cuối nhất quán
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — chờ xử lý — user chọn "Đưa hết vào backlog" ở bước 10 của task 20261112-sprint09-drawer-cancel-invoices; 2026-11-13 — đã sửa — fix-backlog `tất cả` (tdd, sonnet): test `[B-48]` (không có deadlock thật; đột biến thêm khóa `branches` trước ca → đỏ 500); build + `npm test` 204/204 (agent chính chạy lại); file errors `.devloopflow/errors/20261113-sprint09-test-gaps-money-and-concurrency.md`; chưa qua code-reviewer

### B-49 — V1-N1 [Low]
- Task nguồn: 20261112-sprint09-drawer-cancel-invoices (`.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md`)
- File:dòng: .devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/report-1.md
- Finding (nguyên văn của reviewer/tdd/ac-verifier): Verify-ac lần 1: hủy↔hủy và chi↔đóng ca đã chạy HTTP thật; hủy↔đóng ca và hủy↔chi chỉ có chứng cứ từ `npm test`.
- Căn cứ và đề xuất sửa: Chạy lại verify-ac cho ST-5.AC-4/5 với kịch bản HTTP thật khi cần bằng chứng độc lập hơn.
- Test tái hiện đề xuất: Không áp dụng: việc kiểm chứng, không đổi code
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — chờ xử lý — user chọn "Đưa hết vào backlog" ở bước 10 của task 20261112-sprint09-drawer-cancel-invoices; 2026-11-13 — đã sửa — verify-ac lần 2 task 20261112-sprint09-drawer-cancel-invoices: ST-5.AC-4/5 (hai thứ tự) và cặp payCash+cancelPaid có chứng cứ HTTP thật (`.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/report-2.md`, `evidence/v2/e2e-http.log`); không phải sửa code nên không có file errors

### B-50 — V2-N1 [Low]
- Task nguồn: 20261112-sprint09-drawer-cancel-invoices (`.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md`)
- File:dòng: `POS_API/src/sales/tests/payment.integration.test.ts:113,157,359,466,501,650,762,896,1258` (và `POS_API/src/shifts/shifts.service.ts:310,403` đặt `ended_at = new Date()`)
- Finding (nguyên văn của ac-verifier, verify-ac lần 2): "Test cũ `[R14-1]` trong `payment.integration.test.ts` flaky vì đồng hồ container PostgreSQL lệch đồng hồ host. CHECK `ended_at IS NULL OR ended_at > started_at` (`20261103000000-Shifts.ts:22`); test seed `started_at` bằng `now()` của PostgreSQL (`payment.integration.test.ts:501`), `closeShift` đặt `ended_at = new Date()` của Node. Đồng hồ container lệch host theo dạng răng cưa, khoảng -1000..+530 ms (`clock-skew.txt`, 12 mẫu: từ -962 đến 467 rồi -998). Khi DB đi trước host hơn khoảng 190 ms thì `ended_at <= started_at` và CHECK ném lỗi." Lần 1 và 2 của `npm test`: 198/204 pass; lần 3: 204/204; chạy riêng file: 72/72. Không phải hồi quy của Sprint 09.
- Căn cứ và đề xuất sửa: seed `started_at = now() - interval '1 minute'` ở các chỗ seed ca trong file test (hoặc `closeShift` dùng đồng hồ DB — ngoài phạm vi task). Chọn sửa fixture test, không đổi production.
- Test tái hiện đề xuất: `[R14-1]` | input: seed `started_at = now() + interval '5 seconds'` (mô phỏng DB đi trước host) | kết quả mong đợi: đỏ `23514` trước khi sửa fixture; sau khi seed lùi 1 phút thì xanh bất kể lệch đồng hồ
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — chờ xử lý — user: "đưa vào backlog fix luôn" sau verify-ac lần 2 task 20261112-sprint09-drawer-cancel-invoices; 2026-11-13 — đã sửa — fix-backlog B-50 (tdd, sonnet): 9 chỗ seed ca trong `payment.integration.test.ts` đổi `now()` → `now() - interval '1 minute'`; RED bằng đột biến `+5 seconds` (6 test đỏ, `23514`), GREEN 72/72 ×3 và `npm test` 204/204 (agent chính chạy lại: 204/204, file payment 72/72 ×2); file errors `.devloopflow/errors/20261113-payment-test-seed-db-clock-flaky.md`; chưa qua code-reviewer

### B-51 — R1-7 [Low]
- Task nguồn: 20261113-sprint09-ui
- File:dòng: POS_UI/src/features/invoices/InvoicesScreen.tsx:70,80
- Finding (nguyên văn): Hai catch bỏ toàn bộ lỗi server, thay bằng thông báo chung. Người dùng mất nguyên nhân và mã yêu cầu để tra soát.
- Căn cứ và đề xuất sửa: API contract tổng của plan yêu cầu hiển thị tiếng Việt và requestId khi có; giữ message/requestId, có fallback khi lỗi không có thông tin.
- Test tái hiện đề xuất: T4-list/T4-race nhận lỗi có message và requestId → cả hai hiển thị, vẫn tải lại được.
- Phạm vi ảnh hưởng khi sửa: hai catch trong InvoiceList; caller POS_UI/src/app/App.tsx:100; chạy lại invoices-screen.test.mjs. Không đổi API hoặc module khác. Mức: Hẹp.
- Ngày ghi: 2026-11-13
- Trạng thái: đã sửa
- Lịch sử trạng thái: 2026-11-13 — chờ xử lý — review vòng 1 Task B.; 2026-11-13 — đã sửa — TDD `[B-51]` RED/GREEN; `InvoicesScreen.tsx`, `invoices-screen.test.mjs`; agent chính chạy focused 4/4, UI 143/143, build exit 0 và API độc lập 224/224 (`evidence/b51/primary-api.log`); API subagent timeout 300s. Hồ sơ `.devloopflow/errors/20261113-invoice-load-error-details-lost.md`; chưa qua code-reviewer.
- Lịch sử trạng thái: 2026-11-14 — review riêng B-51 vòng 1 PASS; phát hiện khoảng trống test độc lập R1-1 [Low] được ghi B-52, không phát hiện lỗi production B-51.

### B-52 — R1-1 [Low]
- Task nguồn: dùng rời, review riêng B-51 khi chuẩn bị đóng Sprint 09.
- File:dòng: `POS_UI/test/invoices-screen.test.mjs:117`.
- Finding (nguyên văn reviewer): Case stale-list không tạo request pending mới. Vòng lặp trước kết thúc với trạng thái `OPEN`; dòng 117 tiếp tục chọn `OPEN`, nên query key không đổi. `staleList` ở dòng 118 là request đã resolve tại dòng 100; `reject()` ở dòng 120 không có tác dụng. Assertion dòng 121 xanh nhưng không kiểm việc bỏ lỗi từ request danh sách cũ.
- Căn cứ và đề xuất sửa: `rules/testing.md`, mục “Test đáng tin”; plan ST-4.AC-2 yêu cầu bỏ lỗi của request cũ. Chọn trạng thái khác trạng thái hiện tại, ví dụ `PAID`; assert số request tăng một trước khi lưu `staleList`, rồi đổi `CANCELLED` và reject request pending vừa lưu. Reviewer xác minh bằng test instrument trong bộ nhớ; chưa thấy lỗi production.
- Test tái hiện đề xuất: `[B-51] stale list error after changing filters` | input: request PAID pending, chuyển CANCELLED, PAID reject có message/requestId | kết quả mong đợi: lỗi cũ không xuất hiện, CANCELLED vẫn có thể tải thành công.
- Phạm vi ảnh hưởng khi sửa: đổi `POS_UI/test/invoices-screen.test.mjs:117` trong test `[B-51]`; runner `POS_UI/package.json:11`, không có import/caller khác sau khi tìm kiếm. Chạy lại `node --experimental-strip-types --test test/invoices-screen.test.mjs`, sau đó `npm test`; không cần sửa production hoặc module khác. Mức: Hẹp.
- Ngày ghi: 2026-11-14
- Trạng thái: chờ xử lý
- Lịch sử trạng thái: 2026-11-14 — chờ xử lý — review riêng B-51 vòng 1; Low, không chặn kết quả review.
