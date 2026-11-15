---
id: 20261114-react-strictmode-mounted-ref-stuck-false
tags: [ui, reports, react, strictmode, test]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261114-sprint10-reports]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Ref `mounted` chỉ đặt `false` trong cleanup làm nút "Tải thêm ca" vô tác dụng dưới StrictMode

## Triệu chứng
- Finding R1-1 (review vòng 1): `POS_UI/src/features/reports/DailyReportScreen.tsx` dùng `useEffect(() => () => { mounted.current = false; }, [])`. `POS_UI/src/main.tsx:7` bọc `<React.StrictMode>`; React 18 dev chạy mount, cleanup, mount lại, nên `mounted.current` kẹt ở `false`. Mọi phản hồi tải thêm ca (thành công lẫn lỗi) bị bỏ, không có thông báo. Build production không bị.
- Test tái hiện sau khi viết, output Red nguyên văn của `tdd`:
  ```
  not ok 1 - [R1-1] test_ST3_AC2_shift_pages_current strict mode ...
  error: danh sách ca phải gộp trang tải thêm
  + actual - expected
    [ 's1',
  -   's2' ]
  ```

## Nguyên nhân gốc
- Effect chỉ trả cleanup đặt `mounted.current = false` mà không đặt lại `true` trong thân effect. Harness test và browser test không bọc StrictMode nên không thấy. Màn `InventoryScreen.tsx:32` làm đúng (`mounted.current = true` trong thân effect).

## Cách fix
- File và thay đổi: `POS_UI/src/features/reports/DailyReportScreen.tsx` — effect đặt `mounted.current = true` trong thân rồi trả cleanup đặt `false`.
- Test tái hiện: `POS_UI/test/reports-screen.test.mjs::[R1-1] test_ST3_AC2_shift_pages_current strict mode` (harness có tùy chọn `strict`: mount, cleanup, mount lại).

## Quy tắc phòng tránh
- Cờ "đang mounted" dựa trên ref phải đặt `true` trong thân effect, không chỉ đặt `false` trong cleanup. Test màn có callback bất đồng bộ phải có ca chạy theo kiểu StrictMode (mount, cleanup, mount lại).

## Dấu hiệu nhận biết khi review
- `useRef(true)` kèm `useEffect(() => () => { ref.current = false })` không có `ref.current = true` trong thân; harness test không mô phỏng StrictMode.
