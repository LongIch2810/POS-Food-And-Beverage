# Trạng thái: Đã xử lý và kiểm chứng

- Task: tasks/completed/2026-10-30-backend-module-structure.md.
- Commit nền: 4db3149417c77beb09fa40676193a311af22bbd6; refactor/backend-module-structure, dirty.
- Phạm vi: Script thu bằng chứng local, không phải lỗi nghiệp vụ API.

## Triệu chứng và tái hiện

Sau khi dọn riêng JS tương ứng source đã di chuyển, chạy snapshot DB bằng metadata.cjs trước build gây `Cannot find module './store.entity'` từ dist/database/entities/index.js cũ. Tái hiện bằng `node qa-evidence/2026-10-30-103643-4db3149-module-structure/metadata.cjs db`; stderr được lưu nguyên tại run.

Sau khi sửa thứ tự nạp, npm test exit 0 nhưng phép so sánh raw string metadata báo false. Baseline được PowerShell redirect thành UTF-16/CRLF (40728 byte), final qua cmd thành UTF-8/LF (19507 byte). Parse và canonicalize cả hai JSON cho kết quả bằng nhau.

## Nguyên nhân và cách sửa

- Snapshot DB không cần app nhưng script require DataSource tại cấp file. Chuyển require vào nhánh metadata chạy sau build; nhánh DB chỉ dùng pg.
- So sánh raw text phụ thuộc encoding/newline của shell. So sánh JSON đã parse, không sửa các snapshot gốc. Giữ kết quả so sánh false ban đầu riêng để truy vết.

## Kiểm chứng

- Final npm test bao gồm build: 7 pass, 0 fail, 0 skipped, exit 0; DB before/after và metadata command exit 0.
- capture.ps1 -Phase final -CompareOnly: exit 0, metadata và hash migration giống nhau, DB thử không tồn dư.
- Manifest 42 file source khớp source sau test, không sửa mã ứng dụng giữa test và đối chiếu lại.
- Chứng cứ/lệnh/thời gian: qa-evidence/2026-10-30-103643-4db3149-module-structure/run.md; final-test.log; final-result.json; final-prebuild-failure.stderr.log; final-comparison-raw.json; final-comparison.json; final-artifact-check.json.
