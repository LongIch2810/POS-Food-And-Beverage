# QA độc lập — PB-03 làm lại

Trạng thái: đã đối chiếu source và artifact cuối; các finding trong lượt QA này đã được xử lý. Bằng chứng đủ cho phạm vi local của các thay đổi PB-03/PB-13 đã chốt ngày 2026-10-30; chờ quyết định nghiệm thu Product Owner.

- Thời điểm rà: 2026-10-30 khoảng 02:00–02:01 UTC.
- HEAD nền: 53d794b7bfc405f8d77b0f19e7571d3698c7ea98; nhánh feat/pb03-platform; working tree dirty, nguồn có thể tiếp tục thay đổi sau lượt rà.
- Hình thức: QA agent chỉ đọc source/artifact local; không chạy lại runner, không gọi đây là CI độc lập.
- Đã đọc AGENTS, PRODUCT_OVERVIEW, BR-05/80–86/96/97, rules/testing, spec platform mới, plan/task, mã API/UI và output runner.

## Findings / phần cần bổ sung

| ID | Mức | Expected | Actual và căn cứ |
| --- | --- | --- | --- |
| QA-RW-01 | P2 | Theo specs/platform.md phần UI, chuyển tab reset cursor về đầu | PlatformAdminScreen.tsx selectTab chỉ gọi onTabChange; histories giữ cursor cũ. Trường hợp Stores trang 2 → Owners → Stores dự kiến vẫn về trang 2. Mismatch source, chưa tái hiện browser. |
| QA-RW-02 | Chứng cứ | Output log đọc được nhất quán cùng START/END/exit | api-tests.log/ui-tests.log có phần TAP UTF-16 và START/END mã hóa khác; đọc UTF8 thấy NUL, đọc Unicode thì END bị hỏng. Cần capture nhất quán hoặc chuyển mã nguyên văn rõ quy trình, không dựng lại nội dung. |
| QA-RW-03 | Chứng cứ | R1 kiểm tra keyset qua PostgreSQL với timestamp trùng/độ chính xác microsecond, chèn bản ghi giữa hai trang | Unit test chỉ kiểm tra roundtrip cursor; integration có hai trang OWNER nhưng chưa có tie timestamp/chèn mới và stores paging toàn bộ. |
| QA-RW-04 | Chứng cứ | R2 OWNER dù bị gán nhầm permission platform vẫn bị chặn context | Test hiện thấy OWNER bị cấm nhưng chưa cấp nhầm permission nên chưa phân biệt permission thiếu với context từ chối. Admin có pos.sell vẫn bị cấm đã có assertion auth. |

## Những gì đã đối chiếu

- API keyset dùng cặp created_at/id giảm dần, cursor giữ microseconds từ SQL to_char, kiểm tra scope/query trước truy vấn; không thấy lỗi rõ trong source đã đọc.
- Response danh sách có data array và meta; UI service giữ metadata; mutation không tự retry khi fetch lỗi mạng, chỉ retry sau HTTP 401.
- Mật khẩu tạm giữ state, không thấy ghi storage/URL; dialog disableClose theo checkbox và xóa state lúc đóng. Cần browser chứng minh X/Escape/checkbox trên mã cuối.
- API runner artifact có TAP 7 tests, 7 pass, 0 fail; UI TAP 9 tests, 9 pass, 0 fail. Đây là output agent chính thu, QA chưa chạy độc lập và metadata log cần xử lý QA-RW-02.
- R3/R4/R5 chưa có đủ artifact browser/DB trong thư mục lúc rà; không dùng evidence lượt cũ để chứng minh thay đổi mới.

Chưa chạy test/browser trong lượt audit này. Rủi ro còn lại là các phần nguồn đang tiếp tục sửa và bằng chứng chưa phải bản cuối.

## Đối chiếu source bổ sung

Agent chính đã sửa selectTab reset cursor; thêm assertion OWNER có permission platform nhưng vẫn bị context từ chối; thêm hai store có created_at trùng microsecond, chèn store mới giữa hai trang rồi kiểm tra hai ID gốc xuất hiện đúng một lần và nextCursor null. QA đã đọc lại source, không thấy lỗi assertion rõ ràng. QA-RW-01 đã sửa source; QA-RW-03/04 có test tương ứng. Chờ output runner mới và browser cuối để đóng phần chứng cứ. QA-RW-02 vẫn cần capture log thống nhất encoding: đọc auto thấy NUL trong TAP, đọc Unicode thì END hỏng.

## Rà output cuối 02:11 UTC

- Đã mở api-verified.log UTF-8: START 02:10:53.6529156Z, END 02:11:11.2097516Z EXIT 0, TAP 7/7. Đã đối chiếu assertions tie timestamp/chèn mới, concurrent duplicate, OWNER/MANAGER/CASHIER được gán nhầm permission vẫn bị cấm context. QA-RW-03/04 khép trong phạm vi API/test hiện có.
- Đã mở ui-final.log UTF-8: START 02:03:31.8435809Z, END 02:03:32.6727257Z EXIT 0, 9/9; ui-build-latest.log START 02:09:20.5870678Z, END 02:09:30.5096276Z EXIT 0. QA-RW-02 khép bằng log cuối; file cũ giữ để giải thích lượt thất bại.
- Đã mở browser-password-final, browser-add-reset, browser-suspend/reactivate, browser-latest, browser-paging-final và ảnh tablet/password cuối. HTTP 201/200 và response che password khớp; modal disable X/Đóng trước checkbox, Escape giữ dialog, sau xác nhận đóng; storage false và reload không hiện password. DB 0 → store ACTIVE/flag true; ACTIVE|2|0 → SUSPENDED|2|0 → ACTIVE|2|0 khớp giới hạn run, hiệu ứng thu hồi phiên dựa integration test.
- Đã mở api-container-final.log: store.create, owner.create, owner.reset_password, store.suspend, store.reactivate có actor/target/requestId. Console cuối không error.
- Hai điểm cần bổ sung đã báo agent chính: (a) browser-paging-final/latest đọc UI ngay khi nhãn Trang2 đổi, nội dung còn danh sách trang1; cần đợi response và render trang2. Network tải thêm picker 20→22 đã đủ, nhưng không thay cho danh sách chính. (b) ảnh password mask strong có vẻ còn ký tự ở mép phải; cần mask cả paragraph mật khẩu.

Không thấy lỗi hành vi mới trong source đã rà. Chưa kết luận đủ toàn bộ chứng cứ cuối cho đến khi hai điểm trên được đối chiếu lại.

## Kết luận đối chiếu bổ sung cuối

Đã mở `browser-page2-verified.txt`: script chờ HTTP GET cursor 200 và thẻ đầu của response được render, so sánh toàn bộ visibleNames với response (`page2Matches=true`), nội dung Trang2 đúng ba store cuối, quay lại Trang1 đúng. Khoảng trống UI trang2 đã khép.

Đã mở `browser-redaction-confirmed.txt` và cả hai ảnh password được chụp lại; mask toàn paragraph che kín giá trị password, vẫn thấy checkbox và nút Đóng disabled. Khoảng trống che ảnh đã khép. Các ảnh hiện tại là lượt reset mới được ghi rõ, không giả định là ảnh của create ban đầu.

| Case | Đánh giá cuối trong phạm vi local |
| --- | --- |
| R1 | Đủ: assertion PostgreSQL và unit, output API cuối đọc được, UI trang2 đối chiếu response thực |
| R2 | Đủ: permissions hiện hành và ranh giới context platform/store, thử gán nhầm quyền cho OWNER/MANAGER/CASHIER và admin |
| R3 | Đủ: test transaction/duplicate đồng thời/ID/hash/thu hồi phiên, browser API thật tạo/cấp/reset/khóa/mở và DB trạng thái; giới hạn browser không có phiên OWNER sống đã ghi trung thực |
| R4 | Đủ: trang2 thực, quay lại, tab/sidebar reset và store picker tải thêm 20→22 option |
| R5 | Đủ: HTTP response che secret, modal X/Đóng disabled trước xác nhận, Escape không đóng, checkbox cho đóng, storage false, reload không hiện password, ảnh cuối che kín |
| R6 | Đủ: API 7/7, UI 9/9 và build trong các log cuối, START/END/exit đọc được |

Không còn finding hành vi hoặc khoảng trống chứng cứ trong các điểm QA đã báo. Kiểm tra HTTP trên API vận hành chưa tồn tại được hoãn theo quyết định Product Owner; test context không được gọi là chứng minh từng API hóa đơn/ca/kho/doanh thu thật. QA không thay Product Owner tick hoặc quyết định nghiệm thu.

QA chỉ mở source/artifact và ảnh, không chạy lại runner/browser trong lượt đối chiếu này. Bằng chứng vẫn là local trên working tree dirty, chưa có CI/runner độc lập trên commit PB-03.
