# Sổ FAIL của task sprint-09-ac

- Task: sprint-09-ac (verify-ac dùng rời, sáu AC tại sprints/sprint-09/SPRINT.md:33-38).
- Cập nhật lần cuối: 2026-11-13 Asia/Ho_Chi_Minh (sau lần verify-ac thứ 1; timestamp artifact UTC ngày 2026-11-13).
- Điều kiện đóng task: không còn mục trạng thái `mở` và kết quả mới nhất mọi AC thuộc phạm vi là PASS. Quyết định đóng Sprint 09 là bước riêng, không thuộc verifier.
- Báo cáo: [report-1.md](report-1.md).

## Tổng hợp

| Id | AC | Loại | Trạng thái | Phát hiện ở lần | PASS ở lần | Report | Bằng chứng |
|---|---|---|---|---|---|---|---|
| Không có | S9-01..S9-06 | Không có FAIL | Không có mục mở | 1 | 1 | report-1.md | evidence/r1-http.results.json; evidence/r1-final-checks.json; browser/DB từng AC dẫn trong report |

- Loại: Sai | Spec | Lệch tài liệu | Không có chứng cứ | Môi trường | errors/ thiếu.
- Trạng thái khi có finding: `mở` | `đã PASS` | `huỷ do đổi plan/spec`.
- Giới hạn được ghi đầy đủ trong report: local working tree chưa commit; chưa CI/Live; chỉ có manifest SHA-256 cuối lượt, không có manifest trước lượt để so hai đầu. Không tạo bằng chứng pre-run thay thế.
- Timeout do locator sai của verifier đã có chứng cứ thao tác hoàn chỉnh sau khi đọc snapshot; không phải FAIL sản phẩm và không dùng output timeout làm PASS.

## Chi tiết từng FAIL
Không có FAIL mới trong sáu AC đã kiểm. Không có mục lịch sử cũ bị xóa hoặc đổi trạng thái.

## Lịch sử
- 2026-11-13 — lần 1 — S9-01..S9-06 Đúng trên sandbox local; API224/224, UI143/143, HTTP/DB48/48; browser và DB mới theo report-1.md. Cần đọc giới hạn provenance trong report trước khi dùng để quyết định tích hợp/đóng sprint.
