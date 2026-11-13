# Sổ FAIL của task20261113-sprint09-ui

- Task:20261113-sprint09-ui.
- Cập nhật lần cuối:2026-11-13 (sau verify-ac lần2; chỉ kiểm lại V1-1..3 của E2E-AC-5/6).
- Điều kiện đóng: không còn mục mở và kết quả mới nhất của mọi AC là PASS.

## Tổng hợp
| Id | AC | Loại | Trạng thái | Phát hiện ở lần | PASS ở lần | Report | Bằng chứng |
|---|---|---|---|---|---|---|---|
| V1-1 | E2E-AC-5, E2E-AC-6 | Sai | đã PASS | 1 | 2 | report-2.md | evidence/r2-blind-measurements.json; evidence/r2-force-measurements.json |
| V1-2 | E2E-AC-5, E2E-AC-6 | Sai | đã PASS | 1 | 2 | report-2.md | evidence/r2-blind-measurements.json; evidence/r2-force-measurements.json |
| V1-3 | E2E-AC-5, E2E-AC-6 | Sai | đã PASS | 1 | 2 | report-2.md | evidence/r2-force-measurements.json |

## Chi tiết từng FAIL
### V1-1 — Điều khiển đóng ca dưới kích thước chạm đã duyệt
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261113-sprint09-ui/report-1.md`)
- AC: E2E-AC-5, E2E-AC-6; spec G4.
- Loại: Sai. Mức ảnh hưởng: Medium (khả năng dùng UI tablet và khả năng tiếp cận).
- Kỳ vọng theo plan (nguyên văn): “Mục tiêu chạm48px, nút chính56px, gap tối thiểu8px; ô nhập48px.” (UI-6/7, approved plan:95-96).
- Tài liệu nguồn (nguyên văn, path:dòng): `DESIGN.md:33` — “2. **Thiết kế cho ngón tay.** Mục tiêu chạm tối thiểu 48px, nút hành động chính 56px, khoảng cách giữa các nút chạm tối thiểu 8px. Không có thao tác nào chỉ làm được bằng hover.”
- Thực tế: BlindCountClose: nút chế độ40px, ±44×44px, số tờ44px, ghi chú44px, nhập nhanh45.33px. ForceClose: counted45.33px, note44px, nút xác nhận48px ở cả1024×768 và768×1024.
- Bước tái hiện: Đăng nhập cashier có ca OPEN → Ca làm → Đóng ca (Đếm mù); đo getBoundingClientRect cho chế độ/±/input. Đăng nhập owner không ca riêng → chọn ca OPEN → Đóng cưỡng chế; đo input và xác nhận ở hai viewport.
- Path bằng chứng: `evidence/r1-B06-blind-labels.json`; `evidence/r1-B06-force-both-viewports.txt`; `evidence/r1-B06-force-labels-768.png`.
- Test tái hiện đề xuất: B06-close-controls-touch-targets | input: hai modal ở1024×768/768×1024 | expected: controls/input >=48px, primary submit >=56px.
- Trạng thái: đã PASS
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — lần1 — FAIL — `evidence/r1-B06-blind-labels.json`.
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — lần2 — PASS — app thật ở1024×768/768×1024: button/input tối thiểu48px, primary56px, cả bills/direct và Force; `evidence/r2-blind-measurements.json`, `evidence/r2-force-measurements.json`, `evidence/r2-measurement-assertions.log`; `report-2.md`.
- Ng??i s?a: subagent TDD gpt-6.1-sol; file s?a: POS_UI/src/features/shifts/BlindCountCloseShiftModal.tsx, ForceCloseShiftModal.tsx, POS_UI/test/shift-close-accessibility.browser.mjs; h? s? l?i: .devloopflow/errors/20261113-shift-close-touch-targets.md. RED/GREEN: evidence/fix-verify/red.log, green.log.

### V1-2 — Nhãn của trường đóng ca chưa gắn với điều khiển
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261113-sprint09-ui/report-1.md`)
- AC: E2E-AC-5, E2E-AC-6; spec G4.
- Loại: Sai. Mức ảnh hưởng: Medium (khả năng dùng UI tablet và khả năng tiếp cận).
- Kỳ vọng theo plan (nguyên văn): “Label hiện rõ phía trên field, không dùng placeholder thay nhãn.” (UI-6/7, approved plan:95-96).
- Tài liệu nguồn (nguyên văn, path:dòng): `.devloopflow/approved/20261113-sprint09-ui.md:95` — “| UI-6: Form và thông báo có đường sửa | Label hiện rõ phía trên field, không dùng placeholder thay nhãn. Tiền inputmode=numeric/canh phải/đơn vịđ; lý do có giới hạn255 và lỗi ngay dưới field liên quan, nối aria-describedby/aria-invalid; submit sai đưa focus đến field sai đầu tiên, giữ nội dung để sửa. Server error có vùng thông báo đọc được, lỗi toàn thao tác không bị gắn nhầm vào field; uncertain hướng dẫn tải lại trước gửi tiếp, không hứa đã hoàn chuyển khoản. Nhãn hiện cho người dùng dùng từ vựng ca/chi phí/hóa đơn, không đưa tên DTO/permission/BR vào copy mới. | DESIGN.md:506-517,575-627; ui-ux-pro-max §Forms & Feedback và kết quả UX table filtering forms; frontend-design §More on writing |”
- Thực tế: Hai input nhập nhanh/ghi chú BlindCountClose và ba input/textarea ForceClose có id="", labels=[], aria-label=null. getByLabel cho số tiền đếm và lý do đóng cưỡng chế đều trả0; nhãn chỉ là label đứng cạnh không liên kết.
- Bước tái hiện: Mở từng modal trước submit; kiểm input.labels và aria-label; Playwright getByLabel("Số tiền đếm thực tế trong két (VND) *") và getByLabel("Lý do đóng cưỡng chế *") không tìm thấy input.
- Path bằng chứng: `evidence/r1-B06-blind-labels.json`; `evidence/r1-B06-force-labels.json`; `evidence/r1-B06-force-both-viewports.txt`.
- Test tái hiện đề xuất: B06-close-fields-accessible-names | input: count/note/reason ở hai modal | expected: getByLabel tìm đúng1 điều khiển cho mỗi nhãn.
- Trạng thái: đã PASS
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — lần1 — FAIL — `evidence/r1-B06-blind-labels.json`.
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — lần2 — PASS — label.control/id hợp lệ, getByLabel đúng1 cho mỗi field, click label focus đúng ở cả hai viewport; `evidence/r2-blind-measurements.json`, `evidence/r2-force-measurements.json`; `report-2.md`.
- Ng??i s?a: subagent TDD gpt-6.1-sol; file s?a: POS_UI/src/features/shifts/BlindCountCloseShiftModal.tsx, ForceCloseShiftModal.tsx, POS_UI/test/shift-close-accessibility.browser.mjs; h? s? l?i: .devloopflow/errors/20261113-shift-close-field-labels.md. RED/GREEN: evidence/fix-verify/red.log, green.log.

### V1-3 — Viền ô nhập cưỡng chế không đạt tương phản3:1
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261113-sprint09-ui/report-1.md`)
- AC: E2E-AC-5, E2E-AC-6; spec G4.
- Loại: Sai. Mức ảnh hưởng: Medium (khả năng dùng UI tablet và khả năng tiếp cận).
- Kỳ vọng theo plan (nguyên văn): “Đo computed contrast chữ≥4,5:1/chữ lớn≥3:1, control border≥3:1.” (UI-6/7, approved plan:95-96).
- Tài liệu nguồn (nguyên văn, path:dòng): `DESIGN.md:649` — “Viền ô nhập và nút phụ tối thiểu 3:1 so với nền (`--color-border-control`).”
- Thực tế: Ba trường ForceClose dùng computed border rgb(213,219,222) trên trắng; contrast theo relative luminance là1.398450586061828:1. Chữ đạt16.14:1, viền nút Hủy đạt3.0025:1; lỗi nằm ở viền các field.
- Bước tái hiện: Owner → Ca làm → Đóng cưỡng chế ca OPEN; đọc getComputedStyle borderTopColor/backgroundColor; tính WCAG relative luminance cho viền/nền trắng.
- Path bằng chứng: `evidence/r1-B06-force-contrast.json`; `evidence/r1-B06-force-labels-768.png`.
- Test tái hiện đề xuất: B06-force-input-border-contrast | input: các field ForceClose | expected: contrast(border, surface)>=3:1 và dùng border-control.
- Trạng thái: đã PASS
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — lần1 — FAIL — `evidence/r1-B06-force-contrast.json`.
- Lịch sử trạng thái (chỉ thêm): 2026-11-13 — lần2 — PASS — ba trường Force có viền rgb(138,151,157) trên trắng, contrast3.0025039007227687:1 ở cả hai viewport; `evidence/r2-force-measurements.json`, `evidence/r2-force-1024.png`, `evidence/r2-force-768.png`; `report-2.md`.
- Ng??i s?a: subagent TDD gpt-6.1-sol; file s?a: POS_UI/src/features/shifts/ForceCloseShiftModal.tsx, POS_UI/test/shift-close-accessibility.browser.mjs; h? s? l?i: .devloopflow/errors/20261113-force-close-field-contrast.md. RED/GREEN: evidence/fix-verify/red.log, green.log.
