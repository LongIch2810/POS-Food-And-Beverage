---
id: 20261114-ui-shared-client-default-message-masks-screen-fallback
tags: [ui, reports, http-client, test]
found_by: ac-verifier
severity: Medium
occurrences: 1
tasks: [20261114-sprint10-reports]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Message mặc định của HTTP client dùng chung che fallback riêng của màn; test giả service nên không bắt được

## Triệu chứng
- V1-1 (verify-ac lần 1, ST-3.AC-5): body lỗi thiếu `message` làm UI hiện `Có lỗi xảy ra. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)` thay vì `Không tải được báo cáo. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)`. Danh sách ca thiếu message cũng hiện chuỗi chung.
- Red nguyên văn của `tdd`: `not ok 1 ... error: 'Có lỗi xảy ra. Vui lòng thử lại. (Mã yêu cầu: req-reports-2) Thử lại'` và `not ok 3 ... error: 'Có lỗi xảy ra. Vui lòng thử lại. (Mã yêu cầu: req-shifts-1) Tải lại ca'`.

## Nguyên nhân gốc
- `POS_UI/src/http/client.ts:45` gán message mặc định khi thiếu `message`, nên `err.message` luôn có giá trị và fallback trong `describe` của `DailyReportScreen.tsx` không bao giờ chạy trên luồng thật.
- `POS_UI/test/reports-screen.test.mjs` giả `reportService`, nên test xanh dù luồng thật sai.

## Cách fix
- File và thay đổi: `POS_UI/src/http/client.ts` export hằng `GENERIC_ERROR_MESSAGE` và dùng nó (hành vi `request` không đổi). `POS_UI/src/features/reports/DailyReportScreen.tsx` `describe` coi message đúng bằng hằng này là thiếu message và dùng fallback của màn. Không đổi message mặc định ở client vì 6 màn khác dựa vào nó.
- Test tái hiện: `POS_UI/test/reports-screen.test.mjs` `[V1-1] test_ST3_AC5_fallback_through_real_client`, `[V1-1] test_ST3_AC5_shift_list_fallback_through_real_client` (đi qua `http/client.ts` thật, `fetch` giả); `[V1-1] test_ST3_AC5_message_from_server_kept_through_real_client` là bảo vệ hồi quy (xanh ngay).

## Quy tắc phòng tránh
- AC về thông báo lỗi phải có test đi qua HTTP client thật với `fetch` giả, không chỉ giả service. Khi client dùng chung gán giá trị mặc định cho trường mà màn cần fallback, kiểm màn có phân biệt được "thiếu" không.

## Dấu hiệu nhận biết khi review
- Màn có `err.message ?? fallback` hoặc tương đương trong khi client dùng chung đã luôn gán message. Ghi chú: `POS_UI/src/auth/client.ts:40` có cùng chuỗi mặc định (luồng auth), chưa kiểm ảnh hưởng.
