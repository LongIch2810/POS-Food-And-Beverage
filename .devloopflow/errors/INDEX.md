# Sổ lỗi đã sửa
<!-- Mỗi lỗi đã sửa một dòng, dạng `[tag] tóm tắt → <tên file trong .devloopflow/errors/>`. Do record-error thêm; chỉ thêm, không xoá dòng cũ. Các vai trò đọc file này trước, rồi mở file chi tiết của lỗi liên quan, theo mục ".devloopflow/errors/ được đọc ở 6 thời điểm" trong `conventions/SKILL.md` (explorer không đọc, agent chính đọc thay). Chưa có lỗi nào được ghi. -->
[sales, branch-scope] R1-1/R3-1 truy vấn scope bỏ qua branch.access_all (xem/hủy QR) → 20261109-owner-access-all-branch-scope.md
[ui, dialog] R1-2 modal thanh toán thiếu focus trap/Escape/khôi phục focus → 20261109-payment-dialog-focus-trap.md
[shifts, cash] R2-1 đóng ca hardcode doanh thu tiền mặt 0 → 20261109-cash-close-shift-zero-cash-sales.md
[sales, webhook] V1-1 JSON webhook hỏng trả BAD_REQUEST thay vì INVALID_WEBHOOK_PAYLOAD → 20261109-sepay-malformed-json-code.md
[sales, webhook, auth] V2-2 webhook không header chữ ký trả 400 thay vì 401 → 20261109-sepay-unsigned-webhook-status.md
[sales, webhook, exceptions, ui] V3-1/V3-2 message 5 mã lỗi lệch spec; giao dịch sai tài khoản không báo quản lý → 20261109-sepay-wrong-account-hidden.md
[ui, dialog, payment, transfer] B-1 dialog thanh toán kẹt khi manual uncertain và attempt biến mất → 20261110-backlog-payment-dialog-stuck-uncertain.md
[sales, api, branch-scope, permission] B-2 phạm vi chi nhánh fail-open khi branchId rỗng → 20261110-backlog-branch-scope-null-branchid-fail-open.md
[sales, api, payment-preview, invoice-status] B-3 xem trước thanh toán tính lại giá cho đơn không OPEN → 20261110-backlog-payment-preview-non-open-invoice.md
[auth, config, sepay, webhook, secret] B-4 secret webhook SePay không có ngưỡng 32 byte → 20261110-backlog-sepay-secret-minimum-length.md
[ui, dialog, payment, poll] R5-1 poll thấy lượt QR null sau khi đơn vừa PAID thì dialog hiện lại nút thanh toán → 20261110-payment-dialog-poll-paid-race.md
[sales, api, idempotency, transfer, uuid] B-7 replay xác nhận thủ công với UUID viết hoa bị coi là dùng lại key → 20261110-backlog-manual-confirm-replay-uppercase-uuid.md
[sales, webhook, sepay, auth, secret, config] R6-1 chuỗi placeholder trong .env.example vượt ngưỡng 32 byte, webhook chấp nhận chữ ký công khai → 20261110-sepay-placeholder-secret-fail-open.md
[ui, dialog, payment, transfer, idempotency] R7-2 xác nhận thủ công chưa rõ kết quả bị thử lại sang lượt QR khác → 20261110-payment-uncertain-manual-replayed-to-other-attempt.md
[sales, webhook, sepay, http, error-filter] R7-3 biến thể đường dẫn webhook không được ánh xạ lỗi đúng → 20261110-sepay-webhook-path-variant-bypasses-parse-mapping.md
[config, docs, sepay, secret, env-example] R5-2 mẫu .env.example không nêu ngưỡng 32 byte của SEPAY_WEBHOOK_SECRET → 20261110-env-example-secret-threshold-missing.md
[docs, agents, claude, sepay, status] B-5 AGENTS.md/CLAUDE.md ghi SePay Test mode chưa kiểm sau khi V1-4 PASS → 20261110-agents-claude-third-party-status-stale.md
[repo, config, gitignore, graphify] B-6 POS_API/graphify-out/ chưa được ignore → 20261110-graphify-out-untracked.md
[docs, api-spec, sepay, webhook, validation-order] B-8 tài liệu mô tả sai thứ tự kiểm webhook SePay → 20261110-api-spec-webhook-check-order-stale.md
[docs, spec, invoices, promotion, shift] B-9 spec apply-promotion thiếu 409 SHIFT_NOT_OPEN → 20261110-spec-apply-promotion-missing-shift-not-open.md
[auth, test, refresh-token, flaky] B-10 test PB-02 chọn dòng refresh theo created_at toàn bảng → 20261110-pb02-refresh-row-selected-by-created-at.md
[test, sepay, webhook, fixture] B-11 test [R5-2] dùng lại event id 6201 → 20261110-payment-test-event-id-collision.md
[sales, promotion, messages, transfer] B-12 thông báo PROMOTION_NOT_APPLICABLE không thống nhất → 20261110-promotion-not-applicable-message-inconsistent.md
[docs, sepay, env, third-party] R7-4 THIRD_PARTY ghi biến SePay đã dùng là dự kiến → 20261110-third-party-env-vars-marked-planned.md
[sales, webhook, sepay, http, error-filter] B-19 regex chuẩn hóa đường dẫn webhook bỏ mọi dấu / cuối → 20261110-webhook-double-trailing-slash.md
[ui, dialog, payment, transfer, preview] B-17 số tiền cần thanh toán không tải lại khi lượt QR đổi → 20261110-payment-preview-stale-after-attempt-switch.md
[ui, dialog, payment, transfer, error-handling] B-21 lỗi tải lại số tiền khi đổi lượt QR bị nuốt → 20261110-payment-preview-reload-error-swallowed.md
[ui, settings, bank-account, validation, accessibility] B-29 lỗi số tài khoản không gắn vào ô nhập → 20261110-bank-account-error-not-attached-to-field.md
[sales, shifts, cash, reconciliation] R14-1 thanh toán CASH làm tiền đối soát vượt trần → 20261111-cash-reconciliation-exceeds-money-limit.md
[test, sepay, webhook, timestamp, flaky] B-22 test timestamp +301 giây chập chờn ở ranh giới → 20261110-webhook-timestamp-boundary-flaky.md
[test, sales, transfer-attempt, permission, cancel] B-23/B-27 thiếu ca 403 hủy lượt QR; ghi sai về pos.sell → 20261110-cancel-qr-forbidden-cases-missing.md
[test, sales, fixture, order-dependency] B-26 test B-23 phụ thuộc user do test khác tạo → 20261110-test-order-dependency-b16-user.md
[test, sepay, webhook, fixture] B-24 (lần 2) event id 7501 trùng giữa các test → 20261110-payment-test-event-id-collision.md
[test, sepay, webhook, hmac, timestamp] B-13 thiếu test timestamp +301, body đổi giữ chữ ký, chữ ký sai định dạng → 20261110-webhook-negative-cases-test-missing.md
[test, sales, promotion, transfer-attempt, race] B-15 thiếu test mã còn một lượt với hai đơn chờ QR → 20261110-promo-last-use-two-pending-qr-test-missing.md
[test, sales, scope, branch, permission] B-16 thiếu test HTTP phạm vi chi nhánh cho paymentPreview/createTransferAttempt → 20261110-branch-scope-http-test-missing.md
[docs, third-party, vietqr, status-label] B-18/B-25 THIRD_PARTY ghi "dự kiến" cho VietQR đã triển khai và nhãn ngày sai → 20261110-third-party-doc-stale-status-wording.md
[docs, spec, transfer-attempt, error-code] B-20 spec thiếu 409 CONFLICT của POST transfer-attempts → 20261110-spec-missing-409-conflict-transfer-attempt.md
[docs, readme, status] B-28/B-32/B-33 README trạng thái màn hình lỗi thời hoặc thiếu module → 20261110-readme-status-stale.md
[ui, pos, order, payment, state] user 11/11 đơn đã thanh toán vẫn là đơn đang chọn và cho bấm thêm món → 20261111-paid-order-stays-selected-and-editable.md
[ui, pos, order, payment, state] (cập nhật 11/11) cùng gốc ở perform/openTable/danh sách đơn mở → 20261111-paid-order-stays-selected-and-editable.md
[ui, pos, test, payment] R16-1 đường "thanh toán xong → khách mới" của màn POS không có test → 20261111-pay-then-next-order-path-untested.md
[api, permission, sales, test] R16-2 cấp invoice.cancel_open cho MANAGER chỉ kiểm bảng quyền, thiếu test hành vi → 20261111-manager-cancel-open-behavior-untested.md
[docs, plan, spec, permission] R16-3 quyết định MANAGER hủy đơn chưa ghi vào plan/spec/task → 20261111-plan-spec-missing-manager-cancel-decision.md
[docs, spec, ui, pos, payment] B-38/R17-2 spec nói QR chờ khóa cả thanh toán nhưng code vẫn hiện nút → 20261111-spec-qr-pending-locks-payment-wrong.md
[docs, errors, template] B-37/R17-1 file lỗi mới sai found_by và thiếu dòng Test tái hiện → 20261111-error-file-metadata-off-template.md
[ui, pos, notice, test] B-39/B-40 thông báo đơn cũ còn hiện khi làm đơn mới; thiếu assert đơn đã đóng → 20261111-stale-notice-and-missing-closed-order-asserts.md
[sales, api, permission, cancel, test] R1-1 đổi ưu tiên lỗi cancel() (404 trước 409 SHIFT_NOT_OPEN) không có test → 20261113-cancel-open-scope-order-untested.md

[sales, shifts, test, cash, concurrency] B-41/B-42/B-45/B-47/B-48 khoảng trống test sau Sprint 09 (fixture sai nguồn, ca biên, đồng thời) → 20261113-sprint09-test-gaps-money-and-concurrency.md
[shifts, api, swagger, format] B-43/B-44/B-46 Swagger lệch, định dạng, trim thừa → 20261113-sprint09-dto-docs-and-format-nits.md
[test, sales, shifts, flaky, clock] B-50 seed giờ vào ca bằng đồng hồ DB làm [R14-1] và 4 test sau flaky → 20261113-payment-test-seed-db-clock-flaky.md
[ui, shifts, expense, error-handling, uncertain] Task B R1-1 HTTP 500 sau ghi chi cho phép gửi lại trước GET khôi phục → 20261113-expense-http-500-allows-repost.md
[ui, shifts, drawer, dialog, keyboard] Task B R1-2 Escape đóng drawer khi form ghi chi đang POST → 20261113-drawer-escape-closes-busy-expense.md
[ui, drawer, dialog, a11y] Task B R1-3 (lần 2, task khác) Drawer thiếu focus khi mở, trap Tab và khôi phục focus → 20261109-payment-dialog-focus-trap.md
<!-- Historical errors imported 2026-11-12; original statuses unchanged. -->
[legacy, 2026-10-28-argon2-install-path] Lỗi cài Argon2 trên đường dẫn có `&` -> 2026-10-28-argon2-install-path.md
[legacy, 2026-10-28-codex-doctor-sandbox] Codex doctor báo lỗi cấp phát Windows sandbox -> 2026-10-28-codex-doctor-sandbox.md
[legacy, 2026-10-28-pb01-bcrypt-truncation] PB-01 bcrypt cắt mật khẩu bootstrap quá 72 byte -> 2026-10-28-pb01-bcrypt-truncation.md
[legacy, 2026-10-28-pb01-error-envelope] PB-01 lỗi HTTP ngoài health sai hợp đồng API -> 2026-10-28-pb01-error-envelope.md
[legacy, 2026-10-28-pb01-test-env] PB-01 test phụ thuộc biến bootstrap của shell -> 2026-10-28-pb01-test-env.md
[legacy, 2026-10-28-pb02-login-password-race] 2026-10-28-pb02-login-password-race -> 2026-10-28-pb02-login-password-race.md
[legacy, 2026-10-28-pb02-pending-migration] 2026-10-28-pb02-pending-migration -> 2026-10-28-pb02-pending-migration.md
[legacy, 2026-10-28-pb02-permission-snapshot] 2026-10-28-pb02-permission-snapshot -> 2026-10-28-pb02-permission-snapshot.md
[legacy, 2026-10-28-pb02-session-revocation-races] 2026-10-28-pb02-session-revocation-races -> 2026-10-28-pb02-session-revocation-races.md
[legacy, 2026-10-29-auth-proxy-response-empty] Lỗi UI auth khi proxy trả response rỗng -> 2026-10-29-auth-proxy-response-empty.md
[legacy, 2026-10-29-auth-revoked-session-ui] UI giữ phiên sau khi tài khoản hoặc store bị khóa -> 2026-10-29-auth-revoked-session-ui.md
[legacy, 2026-10-29-compose-env-local] Compose local khởi động API sai mật khẩu DB -> 2026-10-29-compose-env-local.md
[legacy, 2026-10-29-pb02-logout-dead-session] 2026-10-29-pb02-logout-dead-session -> 2026-10-29-pb02-logout-dead-session.md
[legacy, 2026-10-29-pb02-unparsed-body] 2026-10-29-pb02-unparsed-body -> 2026-10-29-pb02-unparsed-body.md
[legacy, 2026-10-29-pb02-username-normalization] 2026-10-29-pb02-username-normalization -> 2026-10-29-pb02-username-normalization.md
[legacy, 2026-10-29-qa-temp-cleanup-blocked] Dọn material QA bị automatic approval review chặn -> 2026-10-29-qa-temp-cleanup-blocked.md
[legacy, 2026-10-29-typescript-node10-resolution] TypeScript 6 rejects the API module resolution setting -> 2026-10-29-typescript-node10-resolution.md
[legacy, 2026-10-30-local-env-loading] 2026-10-30-local-env-loading -> 2026-10-30-local-env-loading.md
[legacy, 2026-10-30-module-refactor-evidence-runner] 2026-10-30-module-refactor-evidence-runner -> 2026-10-30-module-refactor-evidence-runner.md
[legacy, 2026-10-30-pb04-acceptance-evidence-gaps] PB-04 — kết luận đủ chứng cứ vượt phạm vi đã kiểm tra -> 2026-10-30-pb04-acceptance-evidence-gaps.md
[legacy, 2026-10-30-pb04-login-role-lock-race] Login bị từ chối khi role thay đổi trong lúc chờ khóa user -> 2026-10-30-pb04-login-role-lock-race.md
[legacy, 2026-10-30-pb04-staff-authorization] PB-04 — phân cấp vai trò và tự khóa tài khoản -> 2026-10-30-pb04-staff-authorization.md
[legacy, 2026-10-30-pb13-active-tab-loading] Bấm tab hiện hành làm kẹt loading -> 2026-10-30-pb13-active-tab-loading.md
[legacy, 2026-10-30-pb13-session-retry-scope] Request cũ không được replay dưới danh tính mới -> 2026-10-30-pb13-session-retry-scope.md
[legacy, 2026-10-30-pb13-tab-row-shape] Đổi tab render rows cũ với columns mới làm trắng màn hình -> 2026-10-30-pb13-tab-row-shape.md
[legacy, 2026-10-30-platform-tab-reload-race] Reload mutation cũ ghi đè cursor tab mới -> 2026-10-30-platform-tab-reload-race.md
[legacy, 2026-11-01-pb13-api-qa-cleanup-timeout] Timeout khi dọn DB foundation trong lượt regression PB-13 -> 2026-11-01-pb13-api-qa-cleanup-timeout.md
[legacy, 2026-11-05-toast-leak-between-sessions] 2026-11-05-toast-leak-between-sessions -> 2026-11-05-toast-leak-between-sessions.md
[legacy, 2026-11-06-pb07-active-resource-race] 2026-11-06-pb07-active-resource-race -> 2026-11-06-pb07-active-resource-race.md
[legacy, 2026-11-06-pb07-inactive-branch-cancel] 2026-11-06-pb07-inactive-branch-cancel -> 2026-11-06-pb07-inactive-branch-cancel.md
[legacy, 2026-11-06-pb07-lost-mutation-response] 2026-11-06-pb07-lost-mutation-response -> 2026-11-06-pb07-lost-mutation-response.md
[legacy, 2026-11-06-pb07-sold-topping-delete] 2026-11-06-pb07-sold-topping-delete -> 2026-11-06-pb07-sold-topping-delete.md
[legacy, 2026-11-06-pb07-uppercase-topping] 2026-11-06-pb07-uppercase-topping -> 2026-11-06-pb07-uppercase-topping.md
[legacy, 2026-11-07-sprint07-update-returning] Lỗi đọc sai kết quả UPDATE RETURNING trong API Sprint 07 -> 2026-11-07-sprint07-update-returning.md
[ui, shifts, accessibility] V1-1 Điều khiển đóng ca nhỏ hơn mục tiêu chạm → 20261113-shift-close-touch-targets.md
[ui, shifts, accessibility] V1-2 Nhãn trường đóng ca không liên kết điều khiển → 20261113-shift-close-field-labels.md
[ui, shifts, accessibility] V1-3 Viền trường đóng cưỡng chế không đủ tương phản → 20261113-force-close-field-contrast.md

[ui, invoices, error-handling] B-51 mất message/requestId khi tải hóa đơn lỗi → 20261113-invoice-load-error-details-lost.md
[ui, tooltip, touch, keyboard] Hủy chạm làm mất thao tác hợp lệ kế tiếp → 20261114-icon-touch-cancel-blocks-next-action.md
[ui, invoices, test, race] B-52 test lỗi danh sách cũ dùng request đã hoàn tất → 20261114-backlog-stale-list-test-settled-request.md
[ui, test, fixture, encoding] B-53 chữ tiếng Việt trong fixture test bị hỏng → 20261114-backlog-icon-test-vietnamese-encoding.md
