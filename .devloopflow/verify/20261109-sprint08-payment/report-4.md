# Kiểm AC 20261109-sprint08-payment — vòng 4

## Kết luận
FAIL: V1-4, V3-1 và V3-2 giữ mở do thiếu chứng cứ nghiệm thu mới. Đây là giới hạn kiểm chứng, không phải kết luận code sai. Nhãn: **chưa xác minh**. Artifact gốc chỉ ở local.

## Phạm vi và nguồn
Chỉ kiểm lại V1-4, V3-1, V3-2. Các AC khác, E2E-AC-1..7, ST-1..8 và RF-1..5 không chạy lại; xem report trước. Đã đối chiếu sổ FAIL, report-3, plan approved:136,211,286,323, specs/invoices.md:36,101,122, docs/BUSINESS_RULES.md:162, THIRD_PARTY_INTEGRATIONS.md:3,12,28, errors/INDEX.md, errors/20261109-sepay-wrong-account-hidden.md, MEMORY và cấu hình devloopflow. Plan dòng 211 là lịch sử; changelog dòng 323 ghi quyết định hiện hành.

## Môi trường và thực thi
Ma trận lập trước tại qa-evidence/20261109-verify-r4-ac-verifier/matrix.md; commit và working tree trong commit.txt và status-before.txt. Đã tạo bản sao harness để chuẩn bị; chưa chạy harness, migration, app, browser, test, build hay coverage vòng này. Lệnh tạo DB thử và chạy app qua exec_command bị hệ thống từ chối trước khi chạy với thông báo chính xác `blocked by policy`; không có lý do chi tiết hơn và không có log quá trình vì không có quá trình được tạo. Không có tiến trình hoặc DB mới từ lệnh đó. Không gọi provider thật khi chưa có môi trường Test mode được xác nhận.

## Bảng đối chiếu
| FAIL | Kỳ vọng và nguồn | Kết quả vòng 4 | Kết luận |
|---|---|---|---|
| V1-4 | SePay Test mode thật, HTTP và DB trước/sau: plan:286; TPI:12 | Chưa có môi trường Test mode được xác nhận; không gọi provider | Sai / không có chứng cứ; giữ mở |
| V3-1 | Năm mã lỗi và message: plan:136, invoices:122; riêng đổi tài khoản theo changelog plan:323 | Chưa có HTTP mới. Runner local trước có test qua nhưng thiếu response từng trường hợp: qa-evidence/20261109-verify-v3-recheck-independent/run.md | Sai / không có chứng cứ; giữ mở |
| V3-2 | Sai tài khoản tiền vào, một mã: giữ đơn chưa thanh toán, hiện WRONG_ACCOUNT đúng scope; tiền ra nội bộ: BR-33:162, invoices:36, plan:323 | Chưa có HTTP/DB trước-sau hoặc browser phiên bản cuối trong vòng này. Runner local trước có test qua nhưng thiếu các artifact đó | Sai / không có chứng cứ; giữ mở |

## Đối chiếu spec
Với phần đã chọn, invoices:36 yêu cầu sai tài khoản tiền vào được báo quản lý và tiền ra cách ly; chưa có bằng chứng hành vi mới để kết luận. Những mục tiêu, phi mục tiêu và ràng buộc khác không chạy lại; chưa xác minh toàn tính năng.

## FAIL và test tái hiện đề xuất
- V1-4: mô phỏng SePay Test mode với tài khoản/reference/amount đúng và các ca thiếu/thừa/muộn/promo; kỳ vọng webhook provider thật, invoice và DB phù hợp plan:286.
- V3-1: test_ST5_ST7_error_messages_match_contract; gây từng mã; kỳ vọng status/code/message đúng hợp đồng, lưu HTTP và DB trước/sau.
- V3-2: test_BR33_wrong_account_is_reported_for_manager; tiền vào sai tài khoản với đúng một reference, replay và tiền ra; kỳ vọng OPEN/PENDING, không payment/stock, quản lý đúng scope thấy WRONG_ACCOUNT, scope khác không thấy; lưu HTTP/DB trước-sau và browser UI.

## Lệch tài liệu
Không kết luận mới vì chưa thực thi hành vi. Hai mục V3-1/V3-2 vẫn mở cho tới khi có bằng chứng chạy lại.

## Đánh giá test, exploratory và errors
Chưa chạy test hoặc exploratory vòng này. Runner trước là local do agent chạy, không phải CI độc lập; assertion không thay thế HTTP/DB/browser được yêu cầu. MEMORY không có mục Hay quên đang có hiệu lực. Đã đọc index lỗi và lỗi liên quan V3; chưa chạy lại case lỗi, chưa kiểm đầy đủ sổ lỗi toàn task.

## Đề xuất
Chạy lại sandbox tại môi trường cho phép khởi tạo app; lưu HTTP đã che, DB trước/sau và ảnh/network UI; đối chiếu từng artifact trước khi đổi trạng thái. SePay Test mode cần môi trường và tài khoản test được xác nhận.
