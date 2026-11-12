# Kiểm AC report 20261109-sprint08-payment — vòng 6

## Kết luận

**FAIL: V1-4, V3-1, V3-2 giữ `mở`.** Ngày 2026-11-09. Đây là thiếu bằng chứng chạy lại, không phải kết luận code sai. Nhãn **chưa xác minh** cho ba FAIL; SQL kiểm tra chuẩn bị mang nhãn **local do agent chạy**. Không có CI/runner độc lập.

- Plan: `.devloopflow/approved/20261109-sprint08-payment.md`, đối chiếu plan active cùng tên, đặc biệt mã lỗi :136, QA provider :286 và Changelog V3 :323.
- Spec: `.devloopflow/specs/20261109-sprint08-payment.md`, `.devloopflow/specs/20261109-sprint08-payment-api.md`, hợp đồng POS hiện hành `specs/invoices.md`.
- Chỉ kiểm lại ba FAIL mở theo yêu cầu. Không chạy lại toàn bộ AC, không sửa source/test/config/plan/task. Không thử cách khởi động khác sau khi startup bị từ chối.

## Tài liệu nguồn đã đối chiếu

- `docs/PRODUCT_OVERVIEW.md`: bối cảnh store/branch, cô lập dữ liệu và transaction.
- `.devloopflow/approved/20261109-sprint08-payment.md`, `.devloopflow/plans/active/20261109-sprint08-payment.md`: mã lỗi, AC, QA Test mode, Changelog quyết định V3.
- `.devloopflow/specs/20261109-sprint08-payment.md`: mục tiêu, phi mục tiêu, phản mục tiêu và ràng buộc Test mode.
- `.devloopflow/specs/20261109-sprint08-payment-api.md`: phần hợp đồng ngoại lệ/webhook; diễn đạt trước V3 cần được đọc cùng Changelog quyết định hiện hành của approved plan và `specs/invoices.md`.
- `specs/invoices.md:36,101,105,122`: sai tài khoản tiền vào, quyền/scope và message.
- `docs/BUSINESS_RULES.md:162`, `THIRD_PARTY_INTEGRATIONS.md:3,10,12,28`: báo quản lý, môi trường và provider chưa kiểm thật.
- `docs/api-spec.md:198-217,368-374`, `docs/DESIGN_DB_POS_SYSTEM.md:410-428`: envelope/mã lỗi và event scope.
- `AGENTS.md`, `.devloopflow/devloopflow.md`: evidence, lệnh hiện có và không có coverage script.
- `.devloopflow/MEMORY.md`, tiêu đề `MEMORY.md`, task active, errors INDEX và các file lỗi liên quan; report-5.md và fails.md.

Đối chiếu chỉ trong phạm vi ba FAIL; không tuyên bố đã audit lại mọi dòng tài liệu hoặc toàn bộ AC.

## Môi trường

- HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf`, working tree dirty giữ nguyên. Trạng thái đầu: `qa-evidence/20261109-verify-ac-r6/status-before.txt`.
- PostgreSQL sandbox hiện có: container `pos_sprint08_test_pg`, 127.0.0.1:55432, DB `pos_s8_verify4_ac`. SQL chỉ đọc exit 0: users=0, invoices=0, migrations=9. Không xóa DB/dữ liệu.
- Dự định API `http://localhost:13040/api/v1`, PUBLIC_ORIGIN `http://localhost:15174`.
- Lệnh startup: `Start-Process` Node `dist/main.js` ở `POS_API/`, `-WindowStyle Hidden`, stdout/stderr dự định về QA; đầy đủ nội dung lệnh tại `qa-evidence/20261109-verify-ac-r6/startup-command.ps1` (không chứa giá trị secret).
- Automatic approval review từ chối lệnh trước thực thi: **`blocked by policy`**. Tool không nêu lý do chi tiết hơn. Không có process API mới/PID/stdout, không có HTTP/browser, không có exit code của process bị chặn.
- Không khởi động UI, không có process mới để dừng, không tạo dữ liệu test để dọn. DB sandbox giữ nguyên.
- Run: `qa-evidence/20261109-verify-ac-r6/run.md`; phần thực thi 19:46:57–19:47:37 +07:00 ngày 09/11/2026. Raw artifact chỉ ở local, không thể đối chiếu từ remote.

## Ma trận trước chạy và rà artifact

Ma trận lập trước startup: `qa-evidence/20261109-verify-ac-r6/matrix.md`, bản sao `evidence/r6-matrix.md`. Các vế cần có HTTP từng lỗi, DB trước/sau, quyền từng actor, replay, OUT và browser UI/network được tách riêng trong ma trận.

| Mục | Tình huống | Artifact mới thực sự có | Phần thiếu |
|---|---|---|---|
| Chuẩn bị | SQL chỉ đọc sandbox | `evidence/r6-db-readonly.log` | Chỉ count ban đầu, không dùng làm bằng chứng hành vi |
| Startup | API sandbox | `evidence/r6-startup-rejection.txt`, `evidence/r6-startup-command.ps1` | Tool error được ghi lại; không có runner/process output do lệnh chưa chạy |
| V3-1 | Từng status/code/message, bao gồm ngoại lệ đổi tài khoản | Không | HTTP và DB trước/sau mỗi lỗi |
| V3-2 | IN sai account, scope, replay, OUT | Không | HTTP, DB trước/sau, browser ảnh/snapshot/network trên UI cuối |
| V1-4 | Provider SePay Test mode thật | Không | Dashboard/cấu hình Test mode và giao dịch mô phỏng provider cùng HTTP/DB |

Đã mở lại artifact tồn tại được dẫn; không tick PASS từ ma trận hoặc từ mô tả dự kiến. `startup-rejection.txt` là bản chép tool response trả về, tool đã rút ngắn command trong error; không phải log do API tạo.

## Kết quả test

Không chạy test mới: 0 test. Không chạy lại toàn suite vì đây là lượt chỉ các FAIL mở, và quy trình dừng khi app không khởi động được. Không viện dẫn 129/129, 54/54 hay 53/53 lượt trước làm kết quả vòng 6. Không có build mới trong lượt này.

## Coverage

Không có script/threshold coverage trong manifest/CI theo cấu hình dự án. Không chạy coverage; không tạo số liệu.

## Đã đối chiếu errors

- Đã đọc `.devloopflow/errors/INDEX.md`, `.devloopflow/errors/20261109-sepay-wrong-account-hidden.md`: chứa triệu chứng, nguyên nhân, fix và kiểm chứng V3-1/V3-2. Kịch bản exploratory cần chạy trùng đúng các vế trong ma trận R6 nhưng chưa chạy vì startup bị chặn.
- Đã đọc các lỗi liên quan webhook/scope: `20261109-sepay-malformed-json-code.md`, `20261109-sepay-unsigned-webhook-status.md`, `20261109-owner-access-all-branch-scope.md`. Các AC tương ứng đã PASS không thuộc lượt retry này nên không chạy lại; không coi việc đọc hồ sơ là kiểm thử.
- Task active ghi finding đã sửa R1-1/R3-1, R1-2, R2-1, V1-1, V2-2, V3-1/V3-2 có file lỗi tương ứng trong INDEX. V3 có file chi tiết đã đọc. Không kiểm lại đầy đủ hồ sơ các finding đã đóng ngoài phạm vi retry và không tạo finding `errors/ thiếu` mới.
- `.devloopflow/MEMORY.md` chưa có mục M-n/Hay quên có hiệu lực; không thêm case M-n giả.

## Bảng đối chiếu các FAIL được yêu cầu kiểm lại

| AC / FAIL | Cách kiểm cần có | Lệnh/bước đã chạy | Kết quả thật | Mong đợi theo plan | Quy định nguồn (nguyên văn + path:dòng) | Kết luận | Chỗ thiếu |
|---|---|---|---|---|---|---|---|
| V1-4, QA SePay Test mode | Provider mô phỏng và HTTP/DB | Không chạy provider | Không có môi trường provider được xác nhận | Plan:286 yêu cầu artifact dashboard, webhook, GET invoice, DB đủ/thiếu/thừa/muộn/promo | “chưa kiểm SePay Test mode thật” (`THIRD_PARTY_INTEGRATIONS.md:3`) | Sai / không có chứng cứ | Giữ mở; HMAC local không thay thế provider |
| V3-1, contract :136 | Tạo mỗi điều kiện lỗi, so literal | Chuẩn bị SQL; startup bị chặn | Không có response V3 mới | Năm mã lỗi/message theo plan:136; ngoại lệ đổi tài khoản theo Changelog:323 | “Lượt chuyển khoản không còn chờ xác nhận.”; “Cửa hàng chưa cài tài khoản nhận chuyển khoản.” (`specs/invoices.md:122`) | Sai / không có chứng cứ | HTTP từng message và DB trước/sau chưa có |
| V3-2, BR-33 / scoped exception | IN sai account, replay, list từng actor, OUT, browser | Chuẩn bị SQL; startup bị chặn | Không có HTTP/DB tác dụng phụ/browser mới | Changelog plan:323: IN đúng một mã lượt sai account báo quản lý WRONG_ACCOUNT; OUT vẫn nội bộ; không thanh toán | “sai tài khoản nhận snapshot cũng không thanh toán và không đổi đơn/lượt” (`specs/invoices.md:36`); “MANAGER chỉ branch mình, OWNER toàn store” (`specs/invoices.md:101`) | Sai / không có chứng cứ | Thiếu toàn bộ artifact hành vi V3-2 của vòng này |

AC không chạy lại trong vòng 6: E2E-AC-1..7; R2-1.AC-1..3; ST-1.AC-1/2, ST-2.AC-1, ST-3.AC-1, ST-4.AC-1, ST-5.AC-1/2, ST-6.AC-1, ST-7.AC-1, ST-8.AC-1/2; RF-1..5. V3 chỉ kiểm lại phần hợp đồng lỗi/ngoại lệ đang mở của các AC liên quan, không kết luận lại toàn bộ ST-5/6/7/8 hoặc E2E.

## Đối chiếu spec (cấp tính năng)

| Mục spec (nguyên văn) | Loại | AC / bước | Kết quả thật | Kết luận |
|---|---|---|---|---|
| “UI chỉ báo thành công khi server đã xác nhận” (`.devloopflow/specs/20261109-sprint08-payment.md`, Mục tiêu QR) | Mục tiêu liên quan | V3-2 UI ngoại lệ | Không chạy browser | Sai / không có chứng cứ trong lượt này |
| “không bật giao dịch ngân hàng Live trong Sprint 08” (cùng spec, Phi mục tiêu) | Phi mục tiêu | Chuẩn bị R6 | Không gọi provider/Live | Đúng cho phạm vi hành động R6; không suy ra kết quả chức năng |
| “đối chiếu sai store/tài khoản/mã đơn/số tiền; lộ hóa đơn của store/branch khác” (cùng spec, Phản mục tiêu) | Phản mục tiêu | V3-2 IN/scope/OUT | Không có HTTP/DB/browser | Sai / không có chứng cứ |
| “dùng Test mode để kiểm thử, không dùng tiền thật” (cùng spec, Ràng buộc) | Ràng buộc | V1-4 | Provider chưa được xác nhận, không gọi | Sai / không có chứng cứ provider |

Các mục tiêu/ràng buộc còn lại ngoài ba FAIL không được chạy lại. Không dùng các dòng trên để thay đổi trạng thái các AC đã PASS ở vòng khác.

## FAIL / bug

- **V1-4:** tái hiện đề xuất: cấu hình SePay Webhooks Test mode được xác nhận, mô phỏng đúng/thiếu/thừa/muộn/promo invalid. Kỳ vọng: provider gửi tới API và lưu HTTP/DB/ảnh dashboard; thực tế: chưa có môi trường xác nhận. Test đề xuất `test_SePay_provider_test_mode_e2e`; input các giao dịch mô phỏng theo plan:286; expected từng trạng thái đúng contract. Bằng chứng hiện trạng: `THIRD_PARTY_INTEGRATIONS.md:3,12`; không có artifact provider mới. Giữ mở.
- **V3-1:** tái hiện đề xuất: gây năm mã lỗi và các nhánh TRANSFER_PENDING/cancel/manual, ghi requestId/status/code/message và DB trước/sau. Kỳ vọng chuỗi đúng `specs/invoices.md:122` và ngoại lệ plan:323. Thực tế startup bị chặn, chưa có response mới. Test đề xuất `test_ST5_ST7_error_messages_match_contract`; input từng case trong matrix; expected literal theo contract. Bằng chứng `evidence/r6-startup-rejection.txt`. Giữ mở.
- **V3-2:** tái hiện đề xuất: IN ký đúng, một mã lượt, sai account; scope OWNER/MANAGER/CASHIER/branch khác/store khác; replay; OUT. Kỳ vọng OPEN/PENDING, không payment/stock/promo, IN một event scoped WRONG_ACCOUNT; OUT chỉ quarantine nội bộ; nhãn UI “Sai tài khoản nhận”. Thực tế startup bị chặn, chưa có HTTP/DB/browser. Test đề xuất `test_BR33_wrong_account_is_reported_for_manager`; input như trên; expected theo `specs/invoices.md:36,101` và Changelog:323. Bằng chứng `evidence/r6-startup-rejection.txt`. Giữ mở.

Không có finding code mới. Ba mục được thêm lịch sử vòng 6 vào `fails.md`, không xóa lịch sử.

## Lệch tài liệu

Không kết luận lệch tài liệu mới từ hành vi vì chưa chạy app. Các mô tả quarantine cũ trong approved plan đã được Changelog:323 xác định là lịch sử; hợp đồng V3 hiện hành đọc theo Changelog đó và `specs/invoices.md:36,101`. Không tự chọn thêm business rule.

## Đánh giá test

Không chạy hoặc đánh giá lại test implementation trong vòng này. Các con số test lượt trước chỉ là lịch sử, không chứng minh HTTP/DB/browser còn thiếu.

## Exploratory

Chỉ SQL chuẩn bị thực sự chạy: sandbox 0 users, 0 invoices, 9 migrations, exit 0. Không chạy exploratory hành vi, RF hoặc case errors vì API startup bị chặn. Không đánh dấu pass cho điều chưa thực thi.

## Đề xuất

Tiếp tục kiểm V3-1/V3-2 khi môi trường cho phép khởi động API sandbox; sau startup lưu từng artifact đúng matrix trước khi xét PASS. V1-4 cần SePay Webhooks Test mode thực được xác nhận. Đồng bộ semantic Graphify cho Markdown báo cáo/sổ FAIL còn cần agent chính điều phối theo quy tắc dự án; verifier không sửa graph ngoài phạm vi được giao.
