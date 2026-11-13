---
id: 20261114-icon-tooltip-ui
spec: .devloopflow/specs/20261114-icon-tooltip-ui.md
plan: .devloopflow/approved/20261114-icon-tooltip-ui.md
status: completed
owner: Codex
started_at: 2026-11-14
completed_at: 2026-11-14
---

# Task 20261114-icon-tooltip-ui

Yêu cầu nguyên văn: “trong bảng các thao tác hay sidebar hay các nút thao tác khi  hiển thị icon + tooltip thay vì chữ nó bị xấu và phình to sửa lại”. Trả lời làm rõ: “Giữ icon, làm tooltip và nút gọn đẹp hơn”.

## Trạng thái
- Bước hiện tại: 10 — completed.
- Đã xong: khảo sát source, tài liệu, lỗi liên quan; user chọn giữ icon, duyệt spec và plan ngày 2026-11-14; tạo nhánh `fix/icon-tooltip-ui` theo đồng ý riêng của user.
- Đang làm: Không có.
- Sắp làm: Không có.

## File đã thay đổi
| Path | Thay đổi gì | Sub-task |
|------|-------------|----------|
| `.devloopflow/tasks/active/20261114-icon-tooltip-ui.md` | Hồ sơ task | Khám phá |
| `.devloopflow/specs/20261114-icon-tooltip-ui.md` | Spec nháp | 2b |
| `.devloopflow/plans/active/20261114-icon-tooltip-ui.md` | Plan đã duyệt | 5 |
| `.devloopflow/approved/20261114-icon-tooltip-ui.md` | Bản plan đã duyệt | 5 |
| `POS_UI/src/components/ui/IconButton.tsx` | Nút icon và tooltip | ST-1 |
| `POS_UI/src/styles/components.css` | Kiểu tooltip có phạm vi riêng | ST-1 |
| `POS_UI/test/icon-actions.browser.mjs` | Test trình duyệt nút icon | ST-1 |
| `POS_UI/src/features/products/ProductsScreen.tsx` | Áp dụng nút icon cho năm thao tác | ST-2 |
| `POS_UI/src/styles/ui.css` | Bố trí nhóm thao tác sản phẩm và size | ST-2 |

## Đã đọc errors
- ST-1: đã đọc INDEX và `20261113-shift-close-touch-targets.md`: kiểm kích thước điều khiển thực trên tablet hai hướng; M-28/M-39.
- ST-1: TDD báo RED/GREEN AC-1..4, sau đó bổ sung case timing, hover, touch, nhãn, contrast và double-click; agent chính chạy lại browser 14/14, UI 143/143 và build exit 0. Một số sự kiện chuột/cảm ứng tổng hợp, chưa chứng minh bằng phần cứng thật. Graphify update exit 0, cảnh báo fail-closed giữ 184 file.
- ST-2: đã đọc INDEX, `20261113-shift-close-touch-targets.md`, M-28/M-39. RED layout/identity ban đầu do thiếu tên truy cập; đột biến bundle handler sai ID cho RED `p0` thay `p1`, khôi phục GREEN. Hồi quy AC-3/4 xanh trước và sau, không có RED riêng; giữ nguyên ô tương ứng trong plan. Agent chính chạy browser 19/19 có đối chiếu rect baseline ba viewport, UI 143/143, browser đóng ca 3/3, build exit 0; ảnh sau tại `evidence/st2-after/`, dùng fixture mock; chưa kiểm thiết bị thật. Graphify báo fail-closed giữ 184 file.
- Graphify: cập nhật semantic bốn tài liệu hiện hành, giữ 61 định danh legacy ở trạng thái superseded; self-check PASS, không force. `graphify-out/.icon-tooltip-scoped-result.json`; không quét hồ sơ lịch sử.

## Lịch sử review (chỉ thêm, không xoá)
- Vòng 1 — 2026-11-14 — CHANGES_REQUIRED; reviewer chạy UI 143/143, browser icon 19/19, đóng ca 3/3, build exit 0.
  - R1-1 [Medium] `POS_UI/src/components/ui/IconButton.tsx:67-70`: `pointercancel` đặt `held.current = true`; trạng thái chỉ được xóa khi bắt đầu touch mới hoặc sau khi nuốt một click. `pointerdown` chuột không xóa nó, còn Enter/Space không có `pointerdown`. Chrome CDP `touchStart → touchCancel → Enter`, Space hoặc click chuột: lần đầu count=0, lần hai count=1. Test đề xuất `[R1-1] canceled touch preserves the next keyboard or mouse action`: cancel gọi 0, mỗi thao tác hợp lệ tiếp theo gọi 1.
  - R1-2 [Medium] `POS_UI/test/icon-actions.browser.mjs:330-335`: test focus trực tiếp, chưa kiểm Tab/Shift+Tab thực qua enabled → disabled → enabled, một tab stop cho disabled, mô tả tooltip và không action. Test đề xuất `[R1-2] Tab traverses enabled and disabled icon controls once in display order`.
  - R1-3 [Medium] `POS_UI/test/icon-actions.browser.mjs:449-459`: `MENU-CALLER-REGRESSION` chưa render `Button` thật có `disabledReason`, chưa kiểm nhãn, lý do nhìn thấy, disabled và callback. Test đề xuất `[R1-3] default Button and disabledReason retain their behavior`.
- Vòng sửa 1/5 — model `gpt-6.1-terra`: R1-1 RED `Enter: first action — 0 !== 1`, GREEN sau sửa `IconButton.tsx`; test tại `POS_UI/test/icon-actions.browser.mjs`, hồ sơ `.devloopflow/errors/20261114-icon-touch-cancel-blocks-next-action.md`. Agent chính chạy browser 22/22, UI 143/143, build exit 0. R1-2 và R1-3: test bổ sung xanh ngay; chưa xác nhận hoàn tất, chờ user quyết theo cổng TDD.
- 2026-11-14: user chọn “Đồng ý tiếp tục” cho R1-2/R1-3; giữ test Tab/Shift+Tab và `Button.disabledReason` xanh ngay, không sửa production cho hai mục này và không lập errors riêng vì là bổ sung test. Reviewer vòng 2 cần kiểm lại cả ba finding và toàn bộ phạm vi.
- Vòng 2 — 2026-11-14 — PASS. Reviewer xác nhận R1-1 sửa đúng, R1-2/R1-3 được phủ; quét lại toàn bộ năm file và caller, không tìm thấy Critical/High/Medium. Browser icon 22/22, UI 143/143, browser đóng ca 3/3, build exit 0 do reviewer chạy. R2-1 Very Low ghi B-53 trong backlog.

## Lịch sử kiểm AC (chỉ thêm, không xoá)
- Lần 1 — 2026-11-14 — PASS 13/13 AC, component thật với fixture mock; report `.devloopflow/verify/20261114-icon-tooltip-ui/report-1.md`, sổ FAIL `.devloopflow/verify/20261114-icon-tooltip-ui/fails.md` không có mục mở. UI 143/143, browser icon 22/22, đóng ca 3/3, typecheck/build exit 0; hash 74 file trước/sau không đổi. Không kiểm API/DB hoặc thiết bị vật lý.

## Cập nhật tài liệu (sync-docs, bước 10b; chỉ thêm, không xoá)
- 2026-11-14: `.devloopflow/devloopflow.md` mục 2 bổ sung lệnh `node --test test/icon-actions.browser.mjs` và kết quả 22/22 từ verify-r1; các tài liệu dự án đã soát, không phát hiện câu cần cập nhật.

## Kinh nghiệm đã ghi (reflect, bước 10c; chỉ thêm, không xoá)
- M-40 (thêm) [Hay quên]: kiểm chuột, Enter, Space lần đầu sau pointercancel — 2026-11-14.
- 2026-11-14: user trả lời “không” khi hỏi có ghi chú thêm cho plugin; không ghi ý user bổ sung.

## Blocked
- Lý do: Không có.
- Lỗi còn lại: Không có kết luận khi chưa thực hiện.
- Đề xuất: Không có.
