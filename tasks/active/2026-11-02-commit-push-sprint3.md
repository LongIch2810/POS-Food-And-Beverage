**Trạng thái:** đang chuẩn bị commit và push theo từng phần.

# Commit và push Sprint 03

- Yêu cầu: Product Owner yêu cầu commit/push theo từng phần sau nghiệm thu local Sprint 03.
- Nhánh: `feat/pb13-organization-ui`; base `9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18`. Đã fetch origin; HEAD bằng origin/master, nhánh hiện tại chưa có upstream và chưa tồn tại trên remote. Sẽ push tạo upstream cho chính nhánh này, không merge/master hoặc force-push.
- Phạm vi: mã/spec PB-04 API, mã/spec PB-13 UI, hồ sơ/bằng chứng QA và kết thúc Sprint 03 đã triển khai trong hội thoại; giữ nguyên source đã được review/nghiệm thu.
- Dự kiến: commit backend; commit frontend; commit bằng chứng QA; commit hồ sơ Sprint/plan/task/errors. Stage danh sách file tường minh theo phần; không stage secret, dependency, build output hoặc raw log lớn.
- Đã kiểm: Git status/diff, rules/git.md, active folders và MEMORY headings; có log API lịch sử23MB cần đóng gói gzip lossless và giữ nguyên raw local trước khi publish. Chưa phát hiện thay đổi ngoài scope.
- Đã hoàn tất: API commit `77462ed` (39 file, gồm entity rename100%); UI commit `8de87c1` (18 file); QA commit `834ec09` (585 file). Mỗi nhóm được stage tường minh và đọc staged diff/stat trước commit.
- Kiểm toàn vẹn:221 mục source/runtime/contract/tooling +500 artifact đều khớp SHA-256. Kiểm trực tiếp583 staged evidence blobs khớp byte working tree. Log API23.572.644 byte được gzip lossless964.602 byte, so giải nén/hash; raw local không xóa và được ignore chính xác một đường dẫn. `.gitattributes` giữ byte của năm thư mục bằng chứng.
- Kiểm publish: không phát hiện mẫu JWT/private key/bcrypt hoặc trường credential JSON chưa che trong artifact text/gzip; mọi file stage dưới2MB, không stage `.env`, credential ngoài repo, dist hoặc node_modules. Các ảnh đã được QA kiểm trong lượt nghiệm thu trước; không chạy lại browser.
- Diff: API/UI `git diff --cached --check` qua. QA có5052 chẩn đoán trailing whitespace của output gốc; chỉ nằm trong qa-evidence, giữ nguyên để bảo toàn checksum, không có conflict marker. Thêm ghi chú publish và cách khôi phục raw sau clone. Lỗi công cụ đóng gói (Windows giới hạn độ dài argv và decode cp1252) đã xử lý bằng stage từng40 đường dẫn và đọc stdout bytes; không thay nội dung artifact.
- Bước tiếp theo: commit nhóm hồ sơ, push tạo upstream nhánh hiện tại, kiểm remote/CI; ghi kết quả cuối rồi đóng task.
- Kiểm thử: dùng bằng chứng local cuối28 UI/48 API và hash đối chiếu đúng source; không tự gọi kiểm tra hash là chạy test mới. CI sau push sẽ được theo dõi theo khả năng công cụ.
- Blocker: chưa có.
