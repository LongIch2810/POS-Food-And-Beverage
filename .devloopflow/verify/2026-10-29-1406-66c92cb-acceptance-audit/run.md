# QA rà soát nghiệm thu PB-02 và PB-13

- Loại: local do subagent QA chạy, không phải CI/runner độc lập. Thời gian: 2026-10-29 14:05:51–14:07:05 +07:00.
- Commit nền: `66c92cbeb41b7b0f3d2dfaf53f9552474ce5310f`; working tree dirty (43 mục trước khi tạo evidence), gồm mã/test PB-02/PB-13 chưa commit. Windows, Node v22.22.2; PostgreSQL 17 container QA riêng `pos-pb13-independent-qa` cổng 55433, đã dừng sau test.
- `npm test --prefix POS_API`, với `DATABASE_URL` đến DB QA, `JWT_SECRET`, `CSRF_SECRET`, `PUBLIC_ORIGIN` thử: exit 0, 5 test runner, 5 pass, 0 fail; [stdout/stderr](evidence/api-test.log). Bộ tích hợp chứa nhiều assertion phụ thuộc trình tự trong một runner, không phải 5 kiểm tra độc lập cho từng tiêu chí.
- `npm test --prefix POS_UI`: exit 0, 7 test, 7 pass, 0 fail; [stdout/stderr](evidence/ui-test.log).
- `npm run build --prefix POS_UI`: exit 0; [stdout/stderr](evidence/ui-build.log). Danh sách tên test nằm trực tiếp trong output hai test log.
- Khởi động PostgreSQL: `docker start pos-pb13-independent-qa`; `docker exec pos-pb13-independent-qa pg_isready` lần đầu chưa sẵn sàng, lần sau sẵn sàng; sau test `docker stop pos-pb13-independent-qa`. Không dùng DB live. Test API tự tạo và xóa database thử.

## Đối chiếu tiêu chí

| Tiêu chí | Kết quả đối chiếu |
| --- | --- |
| PB-02 login, thời hạn, hash, lỗi chung, rate limit | Được kiểm tra trong test tích hợp; log runner đạt. Các assertion gộp trong một test. |
| PB-02 `/me`, quyền, từ chối phiên | Test API kiểm tra trạng thái khóa, thay đổi quyền và guard PLATFORM_ADMIN. Evidence bốn vai trò trong E2E dựa phần lớn vào ghi chép; API nghiệp vụ store chưa triển khai để kiểm tra chéo dữ liệu thật. |
| PB-02 đổi mật khẩu bắt buộc | Test hai phiên, trạng thái DB, cờ, ranh giới 11/12 ký tự và đăng nhập lại; browser luồng modal được ghi tại [run demo](../2026-10-29-112640-66c92cb-demo-auth/run.md), snapshot chỉ có trong phiên tool. |
| PB-02 refresh, replay, Origin/CSRF | Test API đạt và kiểm tra 3 route auth hiện có, rollback, replay. Browser đồng thời hai tab có log server/DB ở [E2E](../2026-10-29-1356-66c92cb-e2e/run.md), nhưng thiếu artifact Playwright chứa response và trạng thái từng tab. |
| PB-02 logout, thiết bị khác, không đăng ký | Test HTTP hai phiên A/B và 404 cho hai path register phổ biến; rà controller auth/health hiện có. Không khẳng định test 404 hai path chứng minh mọi path có thể đặt tên. |
| PB-13 đăng nhập, đổi mật khẩu, tải lại, logout | Các lượt browser cũ được ghi, nhưng phần snapshot trước thao tác và snapshot modal demo chỉ tồn tại trong phiên tool; [run đầu](../2026-10-29-112100-66c92cb-chrome-pb13/run.md), [run demo](../2026-10-29-112640-66c92cb-demo-auth/run.md). QA không chạy lại browser lượt này. |
| PB-13 cookie, token, refresh đa tab | API test cookie và token; E2E qua TLS local với self-signed/ignoreHTTPSErrors có DB và server log. Thiếu output Playwright gốc cho metadata cookie, nội dung storage và trạng thái hai tab; chưa thể đối chiếu độc lập từng khẳng định browser. |
| PB-13 mock, tiếng Việt, tablet | Proxy lỗi tiếng Việt có [Playwright output](../2026-10-29-qa-recheck-1300-66c92cb/evidence/qa-empty-proxy.json). Lần tablet 1024×768 trong [run cũ](../2026-10-29-112100-66c92cb-chrome-pb13/run.md) xảy ra trước khi chuyển về giao diện demo; không có ảnh/snapshot lưu cho kiểm tra responsive trên giao diện cuối. Nhãn demo và vai trò có ghi chép browser trong E2E, không chứng minh API POS/kho. |

## Findings về bằng chứng

- QA-F01 (P2, bằng chứng): [run E2E](../2026-10-29-1356-66c92cb-e2e/run.md) mục E2E-05/06 mô tả cookie, storage và hai tab, nhưng thư mục không có output Playwright gốc hoặc snapshot cho các kết quả đó. Server log và số dòng DB chứng minh request và trạng thái token, không chứng minh đầy đủ thuộc tính cookie hay màn hình mỗi tab. Cần tái chạy và lưu output browser đã che token.
- QA-F02 (P2, bằng chứng): [run tablet](../2026-10-29-112100-66c92cb-chrome-pb13/run.md) kiểm tra bản màn chờ trước khi quay về demo; [run demo](../2026-10-29-112640-66c92cb-demo-auth/run.md) không lưu snapshot và không ghi kiểm tra tablet ngang. Chưa đủ artifact để xác minh tiêu chí tablet trên giao diện cuối.
- QA-F03 (P3, tính độc lập): [test tích hợp](../../../POS_API/src/auth/tests/auth.integration.test.ts) gộp các tình huống vào một test phụ thuộc thứ tự, nên một lỗi đầu ngăn kiểm tra các tình huống sau và output không tách kết quả từng business rule. Lượt này cả runner hoàn tất; giới hạn này không phủ nhận các assertion đã chạy.

Chưa chạy lại browser, chưa kiểm chứng CA được tin cậy và chưa có CI độc lập. UI demo không được dùng làm bằng chứng cho backend bán hàng, kho hoặc thanh toán.
