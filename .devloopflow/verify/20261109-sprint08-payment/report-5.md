# Kiểm AC 20261109-sprint08-payment — vòng 5

## Kết luận
FAIL: V1-4, V3-1, V3-2 tiếp tục `mở` vì chưa có bằng chứng chạy lại hành vi. Nhãn: **chưa xác minh**. Không kết luận code sai. Ngày 2026-11-09.

## Phạm vi và nguồn
Chỉ kiểm lại ba mục FAIL đang mở. Không chạy lại các AC khác, E2E-AC-1..7, ST-1..8 hoặc RF-1..5. Đối chiếu `.devloopflow/approved/20261109-sprint08-payment.md` (mục mã lỗi, webhook, kiểm AC và Changelog V3), `.devloopflow/specs/20261109-sprint08-payment.md`, `.devloopflow/specs/20261109-sprint08-payment-api.md`, `specs/invoices.md`, `docs/BUSINESS_RULES.md`, `THIRD_PARTY_INTEGRATIONS.md`, report-3.md, report-4.md và fails.md. Quyết định hiện hành là Changelog plan:323; các mô tả cũ khác trong plan là lịch sử.

## Môi trường và thực thi
- PostgreSQL sandbox riêng `pos_sprint08_test_pg`, cổng 127.0.0.1:55432; kiểm tra trước cho thấy chưa có DB `pos_s8_verify4_ac`. Lệnh `docker exec pos_sprint08_test_pg psql -U pos_sprint08_test -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE pos_s8_verify4_ac;'` thực sự chạy, exit 0, output `CREATE DATABASE`.
- `npm run migration:run` trong `POS_API/`, với `DATABASE_URL` chỉ tới DB sandbox trên, exit 0; output kết thúc bằng `Migration Payments20261109000000 has been executed successfully.` và `query: COMMIT`. Tool chỉ giữ output đã cắt ngắn, nên không có log migration đầy đủ để dùng làm bằng chứng nghiệm thu schema. DB sandbox được giữ nguyên, không xóa.
- Lệnh khởi động API bằng `Start-Process` với `-WindowStyle Hidden`, cổng 13040 và stdout/stderr về thư mục QA đã bị auto-review từ chối **trước khi chạy**: `blocked by policy`. Không có PID/app mới, không có HTTP, DB trước/sau tình huống, browser hoặc ảnh/network. Dừng tại đây theo yêu cầu retry đúng một lần, không thử cú pháp hay công cụ khác.
- Ma trận định trước: `qa-evidence/20261109-verify-r4-ac-verifier/matrix.md`. Harness được đọc trước, chỉ nhắm endpoint/DB sandbox local; chưa chạy. SePay Test mode provider chưa được xác nhận nên không gọi provider.

## Test, coverage và build
`migration:run` đã build API thành công trong tiến trình trên. Không chạy test/coverage/UI build trong vòng 5; không có kết quả mới để viện dẫn. Không có lệnh coverage cấu hình trong package/CI theo `.devloopflow/devloopflow.md`.

## Bảng đối chiếu FAIL đang mở
| FAIL | Kỳ vọng hiện hành | Kết quả vòng 5 | Kết luận |
|---|---|---|---|
| V1-4 | SePay Test mode thật, đối chiếu HTTP và DB; plan:286, `THIRD_PARTY_INTEGRATIONS.md:12` | Chưa có môi trường Test mode được xác nhận; không gọi provider | Sai / không có chứng cứ; giữ mở |
| V3-1 | Năm mã lỗi và message trong plan:136, `specs/invoices.md:122`; ngoại lệ đổi tài khoản theo plan:323 | Không có HTTP mới do API không khởi động được | Sai / không có chứng cứ; giữ mở |
| V3-2 | Sai tài khoản tiền vào đúng một lượt phải hiện `WRONG_ACCOUNT` cho quản lý đúng scope, không thanh toán; tiền ra cách ly; plan:323, `docs/BUSINESS_RULES.md:162`, `specs/invoices.md:36,101` | Không có HTTP, DB trước/sau hoặc browser UI mới | Sai / không có chứng cứ; giữ mở |

## Đối chiếu spec, exploratory và errors
Không có hành vi mới được chạy nên chưa kết luận thêm về mục tiêu/phi mục tiêu/ràng buộc spec hay exploratory. Không có finding mới. Lỗi V3 liên quan đã được ghi ở `.devloopflow/errors/20261109-sepay-wrong-account-hidden.md`; tình huống tái hiện chưa được chạy vòng này. Test local từ lượt fix trước không thay thế các artifact nghiệm thu còn thiếu.

## FAIL và test tái hiện đề xuất
- V1-4: kiểm SePay Test mode provider thật với chuyển đúng/thiếu/thừa/muộn/promo; lưu request/response đã che và DB trước/sau.
- V3-1: `test_ST5_ST7_error_messages_match_contract` — tạo từng điều kiện lỗi; kỳ vọng status, code, message đúng hợp đồng, có HTTP từng case.
- V3-2: `test_BR33_wrong_account_is_reported_for_manager` — webhook tiền vào sai tài khoản với đúng một mã lượt, replay và tiền ra; kỳ vọng OPEN/PENDING, không payment/stock, `WRONG_ACCOUNT` chỉ hiện đúng scope; có HTTP/DB trước-sau và browser ảnh/network.

## Lệch tài liệu và bước tiếp theo
Không phát hiện lệch tài liệu mới. Cần môi trường cho phép khởi động API sandbox để chạy V3-1/V3-2 và tài khoản SePay Test mode được xác nhận để chạy V1-4. Không dọn DB mới vì yêu cầu hiện tại cấm xóa database.
