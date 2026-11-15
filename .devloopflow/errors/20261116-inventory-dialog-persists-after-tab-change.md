---
id: 20261116-inventory-dialog-persists-after-tab-change
tags: [ui, inventory, state]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261115-sprint10-stock-ledger]
---

# B-65 Dialog kho cũ còn mở sau khi đổi tab

## Triệu chứng
- Mở dialog “Thêm nguyên liệu” ở tab Nguyên liệu, rồi Back sang Sổ kho: dialog cũ vẫn mở và phủ tab mới. Tương tự, dialog “Đặt ngưỡng tồn” ở tab Tồn kho còn mở sau khi chuyển sang Nguyên liệu.
- Hai test `[B-65]` đỏ trước khi sửa với thông báo nguyên văn `dialog của tab cũ phải đóng`, `1 !== 0` (expected 0, actual 1). Nguồn: `POS_UI/test/inventory-screen.test.mjs:223-240`, output Red của lượt TDD 2026-11-16.

## Nguyên nhân gốc
- `InventoryContent` nhận tab mới qua `props.tab`, nhưng state `editing` và `minEditor` không được đặt lại khi `tab` đổi. Hai `Dialog` render theo state này độc lập với tab ở `POS_UI/src/features/inventory/InventoryScreen.tsx:158-167` trước sửa.

## Cách fix
- File và thay đổi: `POS_UI/src/features/inventory/InventoryScreen.tsx:52` — effect theo `[tab]` đặt `editing` về `undefined` và `minEditor` về `null`.
- Test tái hiện: `POS_UI/test/inventory-screen.test.mjs::[B-65] đổi prop tab catalog sang movements đóng dialog Thêm nguyên liệu` và `::[B-65] đổi prop tab stocks sang catalog đóng dialog Đặt ngưỡng tồn`. Mỗi test kiểm dialog đóng sau đổi tab và không tự mở lại khi quay về tab nguồn.
- Kết quả kiểm 2026-11-16: agent chính chạy lại UI `npm test` 221/221, `npm run build` exit 0, browser Sổ kho/router 8/8 và API `npm test` 256/256; subagent TDD chạy riêng test Kho 18/18.

## Quy tắc phòng tránh
- Khi tab đổi từ prop/router/Back, xóa state dialog gắn với tab cũ ở nơi nhận tab mới, gồm cả state không còn hiển thị ở tab mới.

## Dấu hiệu nhận biết khi review
- Dialog mở theo state riêng (`editing`, `minEditor`) nhưng không có cleanup theo prop `tab`; chỉ ẩn dialog theo tab sẽ khiến nó mở lại khi quay về.
