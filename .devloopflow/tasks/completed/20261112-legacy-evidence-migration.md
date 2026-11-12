---
id: 20261112-legacy-evidence-migration
status: completed
owner: Codex
started_at: 2026-11-12
completed_at: 2026-11-12
---

# Nhập chứng cứ QA lịch sử vào cấu trúc verify của devloopflow

## Yêu cầu và quyết định
- User ngày 2026-11-12 yêu cầu áp dụng cùng cách giữ lịch sử cho qa-evidence/ và chứng cứ trong .devloopflow/verify/, theo mẫu evidence của plugin.
- Giữ nguyên toàn bộ nguồn. Không chạy lại AC, không thay đổi kết luận nghiệm thu và không tạo report PASS mới.
- Sao chép qa-evidence/ vào .devloopflow/verify/legacy-qa-evidence/evidence/qa-evidence/; bản sao là archive local và được .devloopflow/.gitignore chặn Git. Chứng cứ Sprint 08 đã có trong .devloopflow/verify/20261109-sprint08-payment/evidence/ giữ tại chỗ.
- Tạo manifest liệt kê đường dẫn, kích thước và SHA-256 nguồn/bản sao; index Markdown dẫn tới manifest local.

## Hiện trạng và bằng chứng kiểm kê
- qa-evidence/: 3.468 file, 1.462.566.422 byte, 155 thư mục con (PowerShell Get-ChildItem -Recurse -File).
- .devloopflow/verify/: 1.022 file, 41.855.578 byte; thư mục verify hiện hành 20261109-sprint08-payment.
- .devloopflow/.gitignore có verify/*/evidence/; root .gitignore chỉ theo dõi Markdown summary trong qa-evidence/.
- Ổ D còn khoảng 89,4 GB tại thời điểm kiểm kê, đủ cho bản sao QA.
- Skill devloopflow:verify-ac yêu cầu raw evidence dưới .devloopflow/verify/<id>/evidence/; report/fails là Markdown được commit.

## Kết quả đã kiểm
- Robocopy chỉ dùng chế độ sao chép /E (không mirror/xóa): exit 1 nghĩa là đã copy, 3.468/3.468 file, 0 failed/mismatch, 155 thư mục con.
- Sau khi cập nhật qa-evidence/README.md trong chính task này, đã copy lại đúng file đó và cập nhật manifest. Tổng QA hiện tại là 3.468 file, 1.462.566.771 byte.
- Python đọc lại từng file nguồn và bản sao, tính SHA-256 rồi so với .devloopflow/verify/legacy-qa-evidence/evidence/manifest.json: PASS 3.468 cặp file, tổng byte khớp.
- Bằng chứng verify Sprint 08 đã có trong .devloopflow/verify/20261109-sprint08-payment/evidence/: 1.000 file, 41.448.300 byte; SHA-256 từng file được ghi vào manifest-historical-20261112.json trong cùng evidence, không tạo bản sao thứ hai.
- Đã tạo ba chỉ mục: .devloopflow/verify/EVIDENCE-INDEX.md; .devloopflow/verify/legacy-qa-evidence/INDEX.md (133 thư mục run/folder cấp đầu); .devloopflow/verify/20261109-sprint08-payment/EVIDENCE-INDEX.md.
- Kiểm 273 link Markdown trong ba chỉ mục: 0 đích thiếu. git check-ignore xác nhận cả hai manifest JSON và bản sao raw dưới evidence/ bị .devloopflow/.gitignore chặn.
- Cập nhật AGENTS.md, CLAUDE.md, qa-evidence/README.md, .devloopflow/devloopflow.md, .devloopflow/LEGACY-MIGRATION.md để dẫn chỉ mục và phân biệt bản sao lịch sử với lần QA mới.
- Giải thích “Số lần” của M-11..M-21 trong .devloopflow/MEMORY.md: nguồn cũ không có bộ đếm lần tái diễn; “chưa ghi” không phải 0 lần hoặc số test.

## Bước làm
1. Kiểm tra đích chưa tồn tại, tạo thư mục archive riêng dưới verify/legacy-qa-evidence/evidence/.
2. Copy toàn bộ cây qa-evidence/ không xóa nguồn, không dùng chế độ mirror/xóa đích.
3. Lập manifest có hash và kiểm tra từng file nguồn/bản sao, đếm đủ số file, dung lượng và đường dẫn.
4. Lập index cho archive và verify evidence hiện có; cập nhật hướng dẫn vị trí chứng cứ mà không đổi policy Git.
5. Chạy kiểm tra Markdown/Git ignore/Graphify liên quan, ghi kết quả; chuyển task sang completed.

## Trạng thái
- Đã kiểm kê và đọc mẫu plugin.
- Đã hoàn tất: Graphify trích xuất phạm vi 9 tài liệu hướng dẫn/chỉ mục mới, giữ 134 bản hồ sơ lịch sử và toàn bộ raw evidence ngoài semantic extraction. Bản graph tạm được query xác nhận trước khi xuất bản; graph chính sau cluster-only có 8.695 nút/17.049 cạnh trong JSON. Query Historical QA Evidence Archive trả về chỉ mục archive và chỉ mục tổng hợp; marker graphify-out/needs_update đã gỡ sau xác minh.
- Kiểm git diff --check cho tài liệu đã sửa: exit 0 (chỉ có cảnh báo quy đổi LF→CRLF của Git cho qa-evidence/README.md). Không chạy test ứng dụng vì không sửa code hoặc hành vi.
- Bước tiếp theo: không có trong phạm vi task. Archive này là snapshot ngày 2026-11-12; lượt QA/verify mới tiếp tục ghi theo quy tắc hiện hành của plugin.
- Blocker: không có.
