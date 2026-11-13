---
id: 20261113-invoice-load-error-details-lost
tags: [ui, invoices, error-handling, request-id]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261113-sprint09-ui]
---

# B-51 — Mất thông báo và mã yêu cầu khi tải hóa đơn lỗi

## Triệu chứng
- Review R1-7: hai catch bỏ toàn bộ lỗi server, thay bằng thông báo chung; người dùng mất nguyên nhân và mã yêu cầu để tra soát.
- RED: `The input did not match the regular expression /Máy chủ chưa tải được danh sách\./`; actual: `Không tải được hóa đơn. Vui lòng thử lại. Tải lại`. Raw: `.devloopflow/verify/20261113-sprint09-ui/evidence/b51/red.log`.

## Nguyên nhân gốc
- Hai catch trong `POS_UI/src/features/invoices/InvoicesScreen.tsx` bỏ đối tượng lỗi và đặt chuỗi thông báo cố định, dù client cung cấp message và requestId.

## Cách fix
- File và thay đổi: `POS_UI/src/features/invoices/InvoicesScreen.tsx` — giữ message và requestId khi có, fallback khi thiếu; giữ guard identity/sequence và chức năng tải lại.
- Test tái hiện: `POS_UI/test/invoices-screen.test.mjs::[B-51] T4-list/T4-race: lỗi tải giữ message/requestId và cho phép tải lại`.
- GREEN: focused 4/4, UI 143/143; build exit 0. API độc lập 224/224, log `.devloopflow/verify/20261113-sprint09-ui/evidence/b51/primary-api.log`. Lượt API của subagent timeout 300 giây, không tính là PASS. Chưa review hoặc kiểm browser sau sửa.

## Quy tắc phòng tránh
- Khi xử lý lỗi đọc API, giữ message và requestId khi có, có fallback và không hiển thị response cũ qua phiên hoặc lựa chọn mới.

## Dấu hiệu nhận biết khi review
- Catch thay toàn bộ lỗi bằng chuỗi cố định mà bỏ message/requestId.
