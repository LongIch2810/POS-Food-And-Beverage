# QA kiểm chứng lại PB-02

- Phân loại: **local do agent QA chạy**, không phải CI/runner độc lập.
- Lệnh đã cấu hình: trong `POS_API`, `npm test` với `DATABASE_URL` trỏ tới PostgreSQL thử nghiệm riêng.
- Commit cơ sở: `1083cd99c0e8b7ac232fa7eb5476e51a4e69e145`; working tree dirty: `AGENTS.md`, `rules/git.md`, `POS_API/src/auth/tests/auth.integration.test.ts`, `MEMORY.md`, các thư mục QA và task chưa theo dõi. Test chưa commit; SHA-256 test được chạy: `59C93CF7CE7F0FA45BA71569FCB1E431BCF978BB794CB018447541D53BBACD42`.
- Windows, Node v22.22.2, Docker 29.4.3, PostgreSQL 17 thử nghiệm riêng, `127.0.0.1:55434`, quyền tạo database thử. Không lưu thông tin xác thực thử nghiệm.
- Bắt đầu: 2026-10-29T10:53:48.0904962+07:00; kết thúc: 2026-10-29T10:54:10.9806146+07:00; exit code 0.
- Runner: 5 test, 5 pass, 0 fail, 0 skipped; build TypeScript được chạy trong `npm test`. Tên từng test và output gốc: [test.log](evidence/test.log); thời gian/exit code: [timing.txt](evidence/timing.txt).
- Đối chiếu từng tình huống: [cases.md](cases.md). Không có artifact request/response riêng: các kết quả này do assertion của test tự động chứng minh, không phải kiểm thử API thủ công.
- Chạy lại: cung cấp PostgreSQL 17 riêng với quyền CREATE DATABASE, đặt `DATABASE_URL`, sau đó chạy `npm test` từ `POS_API`.
