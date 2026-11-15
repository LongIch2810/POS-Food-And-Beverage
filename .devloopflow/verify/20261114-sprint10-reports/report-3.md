# Kiểm AC report 20261114-sprint10-reports — lần 3 (chạy lại V1-2, V1-3)

**Kết luận:** PASS cho phạm vi chạy lại (V1-2, V1-3 đều đúng tài liệu hiện tại). Ngày 2026-11-14. Bằng chứng local do agent chạy, không có CI độc lập.
- Plan: `.devloopflow/approved/20261114-sprint10-reports.md`. Spec: `.devloopflow/specs/20261114-sprint10-reports.md`.
- AC chạy lại: ST-2.AC-6, E2E-AC-4 (V1-2); tham chiếu `docs/api-spec.md:491` (V1-3).
- AC không chạy lại (giữ kết quả report-1/report-2): mọi AC còn lại, kể cả ST-3.AC-5 (PASS ở report-2). Không chạy `npm test`, build, coverage, HTTP/UI; không hồi quy toàn bộ.

**Căn cứ không chạy lại hành vi API:** `sha256sum -c evidence/SHA256SUMS`: 140 file OK, không lệch (gồm `bestseller-http.json`, `bestseller-db.json`); không file nào trong `POS_API/src/reports` mới hơn `SHA256SUMS` (0 file). `POS_API/src/reports/` chưa được git theo dõi nên `git diff --stat` rỗng và không dùng được. Hành vi (top 10, tie name/size/UUID, gộp cùng size, 30000+5000 hiện 35000) đã kiểm ở report-1.

## Bảng đối chiếu
| AC | Tài liệu (nguyên văn, path:dòng) | Kết quả thật | Kết luận |
|---|---|---|---|
| ST-2.AC-6, E2E-AC-4 | `docs/BUSINESS_RULES.md:202`: "\| BR-66 \| Lợi nhuận gộp, giờ cao điểm, báo cáo tuần và tháng. \| GĐ2 \|"; `docs/PRODUCT_OVERVIEW.md:68` (MVP): "Báo cáo doanh thu theo ngày, tách tiền mặt và chuyển khoản; món bán chạy (top 10 theo size, từ đơn `PAID`) theo quyết định Product Owner ngày 14/11/2026, chi tiết ở `.devloopflow/specs/20261114-sprint10-reports.md`."; mục GĐ2 (dòng 70-77) không còn "món bán chạy". Plan/spec (không đổi) làm món bán chạy trong Sprint 10; `sprints/sprint-10/SPRINT.md:10`, `docs/PRODUCT_BACKLOG.md:7` cùng hướng. | `evidence/r3-V1-2-V1-3-docs-check.txt`: `rg "bán chạy" docs sprints` không còn chỗ nào xếp món bán chạy vào GĐ2; hành vi API khớp plan (report-1, SHA OK). | Đúng |
| V1-3, `docs/api-spec.md:491` | Dòng 491: "\| Báo cáo \| `/reports/revenue` \| Theo vai trò (BR-65) \| `.devloopflow/specs/20261114-sprint10-reports.md` \|"; plan `approved/...:332` yêu cầu đúng nội dung này. `rg -n "legacy-reports" docs/api-spec.md` không kết quả; file spec được trỏ tồn tại (9277 byte). | Khớp plan. | Đúng |

**Phát hiện mới (không FAIL, không tự chọn bên):**
1. `sprints/sprint-10/SPRINT.md:10` còn ghi "Phần món bán chạy vốn thuộc Giai đoạn 2 theo Product Overview/BR-66; đây là ngoại lệ phạm vi Sprint 10". Sau khi sửa tài liệu, Product Overview/BR-66 không còn xếp món bán chạy vào GĐ2 nên câu này đã lỗi thời (không mâu thuẫn kết quả, chỉ cũ lý do). Đề xuất sync-docs sửa câu.
2. `docs/PRODUCT_BACKLOG.md:7` còn ghi "Chưa có spec/plan triển khai hoặc QA Sprint 10", đã sai so với hồ sơ hiện có; plan (dòng 332-336) đã hẹn cập nhật ở sync-docs.
3. `docs/PRODUCT_OVERVIEW.md` đã sửa nhưng chưa commit (git status M), nhắc để không mất khi đóng task.

**Đối chiếu spec:** mục tiêu spec dòng 13 (danh sách món bán chạy) không còn lệch với BR-66/Product Overview. Các mục spec khác không chạy lại.

**FAIL còn lại:** không còn mục `mở` trong `fails.md`. Điều kiện đóng task (mọi AC mới nhất PASS) phụ thuộc kết quả report-1/2 cho AC không chạy lại, đã đủ theo các lần đó.

## Bằng chứng
`evidence/r3-V1-2-V1-3-docs-check.txt`.
