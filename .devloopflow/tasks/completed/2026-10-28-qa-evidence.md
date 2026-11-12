# Ghi bằng chứng thực thi QA

- Trạng thái: completed
- Mục tiêu: yêu cầu QA cung cấp dấu vết kiểm chứng cho mỗi kết quả test hoặc kiểm tra thủ công.
- Plan liên quan: không có.
- Nhánh: `docs/architecture-and-rules`.

## Đã làm

- Kiểm tra QA agent, AGENTS.md, rules/testing.md và trạng thái repository.
- Xác định báo cáo tổng như “67 pass, 0 fail” không đủ để đối chiếu đã chạy thật.
- Thêm quy trình bằng chứng vào `AGENTS.md`: run ID, commit, dirty state, lệnh, thời gian, exit code, log/test report và chứng cứ API/UI/DB theo tình huống.
- Cập nhật `.codex/agents/qa.toml` để QA chỉ báo kết quả có đường dẫn artifact, phân biệt CI độc lập/local/chưa xác minh.
- Tạo `qa-evidence/.gitkeep`; không tạo run giả.
- Kiểm tra TOML QA bằng `tomllib`, đường dẫn evidence và `git diff --check -- AGENTS.md`: đạt.

## Đang làm

- Không còn phần dở dang.

## Tiếp theo

- Không có.

## Lỗi hoặc điểm chặn

- File do agent tự ghi không phải bằng chứng độc lập. Repo hiện chưa có CI QA; để xác thực độc lập một lần chạy cần CI/runner ngoài phiên agent và URL/ID run. Chưa có lần chạy QA thật nên chưa có run artifact.
