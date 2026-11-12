# QA PB-02: bổ sung bằng chứng test

- Phân loại: **local do agent chạy**, không phải CI độc lập.
- Lệnh: từ `POS_API/`, chạy `npm test` với `DATABASE_URL` trỏ tới PostgreSQL thử nghiệm riêng.
- Commit cơ sở: `1083cd99c0e8b7ac232fa7eb5476e51a4e69e145`; working tree dirty, gồm test mới chưa commit và các thay đổi có sẵn ngoài task.
- Môi trường: Windows, Node v22.22.2, Docker 29.4.3, PostgreSQL 17 riêng trên `127.0.0.1:55433`; thông tin kết nối thử nghiệm không ghi vào log.
- Bắt đầu: 2026-10-29T10:51:35.4026400+07:00; kết thúc: 2026-10-29T10:51:59.6527049+07:00.
- Exit code: 0; runner: 5 test, 5 pass, 0 fail, 0 skipped. `npm test` bao gồm build TypeScript.
- Output gốc: [test.log](evidence/test.log); thời gian và exit code: [timing.txt](evidence/timing.txt).

Test tích hợp PB-02 gộp các assertion: logout phiên A chặn access/refresh A và giữ access/refresh B; lỗi chèn refresh khiến xoay token rollback và token cũ vẫn sử dụng được; lỗi thu hồi token khiến thay đổi mật khẩu rollback và phiên vẫn dùng được; đổi mật khẩu tự nguyện thành công, thu hồi phiên đang dùng và phiên khác. PostgreSQL trigger chỉ được tạo trong database thử để tiêm lỗi.

Giới hạn: đây là test HTTP với cookie được gửi thủ công; chưa chứng minh hành vi browser qua HTTPS thật. Chưa có CI/runner độc lập. Để chạy lại, cấp PostgreSQL 17 riêng với quyền CREATE DATABASE, đặt `DATABASE_URL` và chạy lệnh trên.
