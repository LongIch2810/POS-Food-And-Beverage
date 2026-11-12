# Dọn material QA bị automatic approval review chặn

Trạng thái: chưa giải quyết; cần dọn thủ công hoặc khi môi trường cho phép.

- Triệu chứng: Lệnh xóa các file tạm do lượt kiểm thử PB-13 tạo và chứng chỉ self-signed trong CurrentUser\My bị công cụ từ chối trước khi PowerShell chạy.
- Điều kiện tái hiện: Sau lượt QA 2026-10-29, gọi `exec_command` với lệnh kiểm tra đường dẫn/tên chứng chỉ rồi xóa đúng các file riêng lẻ trong `C:\Users\Admin\AppData\Local\Temp\pos-pb13-qa-20261029-1356` và chứng chỉ thumbprint `1F0AAF51781F3F87B637A3F0951708FD65A4D24E`.
- Nguyên nhân xác minh được: automatic approval review trả `blocked by policy`, không nêu quy tắc cụ thể. Không có lệnh xóa nào được chạy trong lần gọi đó; chưa thử cách viết/công cụ khác.
- Tác động: file tạm chứa secret QA và PFX self-signed còn trên máy; cert còn trong `Cert:\CurrentUser\My`, không được thêm vào Root. API/TLS QA đã dừng, DB QA riêng đã xóa; container live không dùng material này.
- Hướng xử lý: người dùng dọn đúng đường dẫn/thumbprint trên hoặc thực hiện khi policy cho phép; kiểm tra lại `Test-Path` cho thư mục và cert. Không xóa đường dẫn rộng hoặc cert khác.
- Bằng chứng lượt test và cleanup: `qa-evidence/2026-10-29-1356-66c92cb-e2e/run.md`; task `tasks/active/2026-10-29-pb13-auth-ui.md`; commit nền `66c92cb`.
