# Báo cáo kiểm AC lần 1 — 20261109-sprint08-payment

- Kết quả tổng: **FAIL** (1 Sai mức Low, 2 Lệch tài liệu, 1 Không có chứng cứ). Nhãn: **local do agent chạy** (ac-verifier subagent), không phải CI/QA độc lập.
- Commit `48ed476`, working tree dirty (65 mục). Bắt đầu 2026-11-09 16:08:31 +07, kết thúc 16:33:28 +07 (`qa-evidence/20261109-160831-48ed476-s8-verify-ac/end.txt`).
- Bằng chứng thô: `.devloopflow/verify/20261109-sprint08-payment/evidence/` (không lên git) và `qa-evidence/20261109-160831-48ed476-s8-verify-ac/` (local). Báo cáo này do agent chính ghi lại từ report của ac-verifier vì subagent bị chặn ghi file; agent chính chưa mở lại từng artifact.
- Môi trường: DB sandbox riêng `pos_s8_verify` trong container `pos_sprint08_test_pg` (cổng 55432), migrate bằng `npm run migration:run`; API :3000, UI :5173; Chrome 157 (chrome-devtools MCP), viewport 1180x820 và 1024x768; script HTTP+SQL `evidence/scripts/part*.mjs`. Tồn kho đầu kỳ nạp bằng SQL `stock_movements` IMPORT vào sandbox (MVP chưa có API nhập kho). Webhook ký HMAC bằng secret tạm gọi endpoint local — **không phải SePay Test mode thật**.
- Đã dọn: dừng API/UI, DROP DATABASE `pos_s8_verify`, xóa trigger tạm; không động `pos_local`, không xóa volume.

## Test tự động
| Lệnh | Exit | Kết quả |
|---|---|---|
| `npm test` POS_API | 0 | 124/124 pass (`api-test.stdout.log`) |
| `npm test` POS_UI | 0 | 53/53 pass |
| `npm run build` POS_UI | 0 | thành công |
| coverage | — | dự án không có lệnh |

## Bảng AC
| AC | Kết luận | Bằng chứng chính |
|---|---|---|
| E2E-AC-1 preview 60k−10k=50k, quyền, store/branch | PASS | `api-run` `E2E-AC-1.*`, ảnh UI1 |
| E2E-AC-2 CASH 50k/100k, thối 50k, replay | PASS | `E2E-AC-2.*`, `r1-UI1-*`, `r1-UI2-*` |
| E2E-AC-3 0đ, rollback, replay | PASS | `E2E-AC-3.*`, `r1-UI4-*` |
| E2E-AC-4 QR thiếu/đủ/dư, mã hết lượt | **Lệch tài liệu** | hành vi đúng; BR-33/THIRD_PARTY còn bản cũ (V1-2) |
| E2E-AC-5 hủy QR A, tạo B, tiền A đến muộn | PASS | `E2E-AC-5.*`, `r1-UI3-*`, `r1-UI5-*` (cặp hủy A→tạo B chỉ chạy qua API) |
| E2E-AC-6 MANAGER/OWNER xác nhận hộ | **Lệch tài liệu** | hành vi đúng; BR-33 stale (V1-2) |
| E2E-AC-7 tài khoản 19/20 chữ số | PASS | `E2E-AC-7.*`, `r1-UI6-*` |
| ST-1.AC-1, ST-1.AC-2 | PASS | `ST-1.AC-*`, `ST-1.AC-2-db-errors.txt` (SQLSTATE 23514) |
| ST-2.AC-1, ST-3.AC-1, ST-4.AC-1 | PASS | `ST-2.*`, `ST-4.*`, `RF-4.keep2` |
| ST-5.AC-1, ST-5.AC-2 | PASS | `ST-5.*` |
| ST-6.AC-1 (gồm delta ref rỗng/trùng) | **Sai (Low)** | JSON hỏng → `BAD_REQUEST` thay vì `INVALID_WEBHOOK_PAYLOAD` (V1-1); phần còn lại đúng |
| ST-7.AC-1 | PASS | `E2E-AC-6.*`, `ST-7.*`, `r1-UI7-*` |
| ST-8.AC-1, ST-8.AC-2 (browser) | PASS | UI1..UI7 |
| R2-1.AC-1, AC-2, AC-3 | PASS | `R2-1.*` |
| RF-1..RF-5 | PASS | chạy cùng các AC trên |
| SePay Test mode thật (plan :275, :286) | Không có chứng cứ | V1-4 |

## Chi tiết đáng chú ý
- E2E-AC-4: thiếu tiền (49.999đ rồi thêm 1đ) giữ OPEN, không cộng dồn; 60.000đ cho đơn 50.000đ → PAID, `payments.amount` 50.000, thực nhận 60.000, dư 10.000, kind BANK, lượt mã +1, SALE do hệ thống; replay cùng event id không đổi; mã hết lượt trong lúc chờ QR → đơn giữ OPEN, event `PROMOTION_INVALID`, OWNER/MANAGER thấy, CASHIER 403.
- E2E-AC-6: MANAGER không có ca riêng xác nhận được; invoice giữ ca gốc của thu ngân; SALE ghi `USER` tạo bởi MANAGER; webhook đến sau không tạo payment/kho lần hai; các lỗi sai quyền/branch/store/ref trùng/thiếu lý do/thực nhận thiếu đều bị từ chối.
- ST-6 delta: ref rỗng/khoảng trắng → `SEPAY:601`/`SEPAY:602` kind `SEPAY_EVENT`, ACK 200; ref ngân hàng thật `SEPAY:601` không va chạm; hai event cùng ref trên hai lượt QR → một PAID, một DUPLICATE đúng store/branch, ACK 200 kể cả chạy song song; ngoại lệ DUPLICATE không lộ đơn trước.
- ST-8: mất response sau khi server commit rồi retry → cùng Idempotency-Key/body, DB 1 payment; cảnh báo kho hiện trước xác nhận; reload giữ mã QR.
- R2-1: mở két 100.000, CASH 50.000, đếm 150.000 → cash_sales 50.000, expected 150.000, MATCHED; TRANSFER/0đ/CANCELLED không cộng; còn đơn OPEN → 409; GET ca mở không lộ expected; force-close, ca không bán, rollback trigger tạm, race khớp (race chạy một lần).

## Lỗi của chính script verifier (đã chạy lại)
Dòng thay thế nằm trong `evidence/api-run/results.jsonl`: `RF-4.keep`→`keep2`, `E2E-AC-6.shift-kept`→`shift-kept2`; helper `nextHookId` trùng event id → chạy lại `part4b.mjs` (thay `E2E-AC-4.promo-invalid`, `promo-invalid-visibility`, `ST-6.delta.namespace`, `ST-6.dup.first`, `ST-6.dup.event`; hai check lần đầu có thể pass giả: `ST-6.delta.no-fallback-on-underpaid`, `ST-6.dup.replay`, bản chạy lại pass thật); chưa dọn đơn OPEN → thay bằng `part5b` (`R2-1.blind-before`, `R2-1.AC-1.close`, `R2-1.cleanup-b2`, `R2-1.AC-2` đợt đầu). Một lần `ECONNRESET`, chạy tiếp bằng `part2b.mjs`. Tổng 190 dòng, 172 pass, 18 FAIL = 1 FAIL thật (V1-1) + 17 lỗi script.

## Chưa quy định trong tài liệu (cần Product Owner)
- OBS-1: MANAGER có ca CASHIER bán được nhưng 403 khi hủy đơn OPEN của chính mình (`invoice.cancel_open` chỉ OWNER/CASHIER, `specs/sales.md:17`); còn đơn OPEN thì MANAGER không đóng ca (409 `SHIFT_HAS_OPEN_INVOICES`) và OWNER không hủy hộ được (cần ca riêng, 409 `SHIFT_NOT_OPEN`); chỉ thanh toán mới thoát. Bằng chứng: tag `mgr-cancel-open`, `cleanup-cancel-inv` trong `http-log.jsonl`.
- UI mức Low: tiêu đề hiện "Chi nhánh Nam Lý" dù chi nhánh thật "Chi nhanh 1"; "Thanh toán thành công." còn hiện sau khi tạo đơn mới; danh sách "Giao dịch cần đối soát" hiện UUID hóa đơn thô.

## Chưa xác minh trên browser
Bẫy focus Tab/Shift+Tab/Escape (R1-2; chỉ test tự động UI); lỗi ảnh QR giả lập bằng `dispatchEvent(error)`; bấm đúp; múi giờ hiển thị; diff dependency.
