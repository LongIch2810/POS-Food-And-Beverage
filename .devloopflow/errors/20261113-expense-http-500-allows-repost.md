---
id: 20261113-expense-http-500-allows-repost
tags: [ui, shifts, expense, error-handling, uncertain]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261113-sprint09-ui]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# HTTP 500 sau POST ghi chi cho phép gửi lại trước khi tải lại ca (R1-1)

## Triệu chứng
- Nguồn: finding review vòng 1 ghi tại `.devloopflow/tasks/active/20261113-sprint09-ui.md`: `POST ghi chi trả HTTP 500 với code INTERNAL_ERROR không vào uncertain. finally mở khóa; nút Lưu còn enabled và không có tải lại GET. Gửi lại cùng form tạo POST thứ hai dù kết quả lần đầu chưa chắc chắn, trái ST-7.AC-4/RF-4 và spec G4.`
- Output harness do reviewer báo, nguyên văn: `{posts:2,submitEnabledAfter500:true,reloadAvailable:false}`. Không có artifact RED riêng được cung cấp cho lượt ghi hồ sơ này.

## Nguyên nhân gốc
- Nhánh `catch` của `handleSubmit` trong `POS_UI/src/features/shifts/AddExpenseModal.tsx` chỉ chuyển sang `uncertain` cho mã `NETWORK_ERROR`/`UNKNOWN`, bỏ qua HTTP 500 có mã `INTERNAL_ERROR`. Sau khi `finally` hạ trạng thái busy/loading, form cho gửi lại dù POST trước chưa xác định được kết quả.
- Đối chiếu finding với source sau sửa và test `[R1-1] HTTP 500 after expense POST blocks another POST until both reads finish`: lỗi mô phỏng có `code: 'INTERNAL_ERROR', status: 500`; test kiểm số POST, khóa nút Lưu và cả hai lượt GET khôi phục.

## Cách fix
- File và thay đổi: `POS_UI/src/features/shifts/AddExpenseModal.tsx` — khi đã bắt đầu POST (`posted`), đưa cả `err?.status >= 500` vào trạng thái chưa xác nhận; chặn submit bằng `uncertain` và giữ hành động `Tải lại ca và danh sách` gọi `getCurrentShift()` cùng `getExpenses(shiftId)`.
- Test tái hiện: `POS_UI/test/shift-expense.test.mjs::[R1-1] HTTP 500 after expense POST blocks another POST until both reads finish`.
- Kiểm chứng local do agent ghi hồ sơ chạy ngày 2026-11-13, trong `POS_UI/`: `node --experimental-strip-types --test test/dialog-focus.test.mjs test/shift-expense.test.mjs`, exit 0. Output đầy đủ: `.devloopflow/verify/20261113-sprint09-ui/evidence/record-error-r1-1-3-focused.log`.
  ```text
  ok 9 - [R1-1] HTTP 500 after expense POST blocks another POST until both reads finish
  # tests 20
  # suites 0
  # pass 20
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
  ```
- Lượt ghi hồ sơ không chạy lại browser hoặc CI; kết quả này là test harness local.

## Quy tắc phòng tránh
- Khi POST không có idempotency gặp HTTP 5xx, giữ trạng thái chưa xác nhận và khóa gửi lại cho đến khi các lượt đọc khôi phục đã hoàn tất.
- Test lỗi sau POST bằng cả lỗi mạng và HTTP 500 có mã lỗi API; kiểm số POST thật qua biên service và các lượt GET khôi phục.

## Dấu hiệu nhận biết khi review
- Nhánh `catch` chỉ kiểm `err.code` cho lỗi mạng trong khi `finally` luôn bỏ khóa gửi.
- Mutation không có idempotency cho phép nút Lưu hoạt động ngay sau lỗi 5xx mà không tải lại dữ liệu.
