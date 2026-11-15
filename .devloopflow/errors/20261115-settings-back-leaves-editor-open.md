---
id: 20261115-settings-back-leaves-editor-open
tags: [settings, ui, state]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261115-sprint10-stock-ledger]
---

# Back khi editor/confirmation mở không đóng chúng (SettingsContent)

## Triệu chứng
- R1-1: Back trong lúc editor hoặc confirmation đang mở: dialog "Bàn" vẫn hiện trên danh sách "Chi nhánh"; lưu xong `refresh()` tăng revision của tab hiện tại, không phải danh sách đang sửa; `confirmation.tab` mang tab cũ nên xác nhận chạy trên dòng của tab khác.
- Red: `not ok 139 - test_ST7_AC7_back_dong_editor_khi_doi_tab [R1-1]` và `not ok 140 - test_ST7_AC7_back_dong_confirmation_khi_doi_tab [R1-1]` (editor props vẫn tồn tại sau `setProps({tab:'branches'})`).

## Nguyên nhân gốc
- Effect `[tab]` ở `SettingsScreen.tsx` chỉ gọi `navigate(...)`; `setEditor(null)`, `setConfirmation(null)`, `fieldErrors`, `formError` không được đặt lại khi tab đổi từ prop.

## Cách fix
- File và thay đổi: `POS_UI/src/features/settings/SettingsScreen.tsx` — effect `[tab]` gọi `setEditor(null); setConfirmation(null); setFieldErrors({}); setFormError('')` trước `navigate`.
- Test tái hiện: `POS_UI/test/organization-screen.test.mjs::test_ST7_AC7_back_dong_editor_khi_doi_tab [R1-1]` và `::test_ST7_AC7_back_dong_confirmation_khi_doi_tab [R1-1]`

## Quy tắc phòng tránh
- Khi tab/view đổi từ nguồn ngoài (prop, router, Back), đặt lại mọi state gắn với tab cũ (editor, confirmation, lỗi form).

## Dấu hiệu nhận biết khi review
- State dạng `editor`/`confirmation` mang dữ liệu của tab nhưng chỉ được xóa trong handler click tab, không trong effect theo prop `tab`.
