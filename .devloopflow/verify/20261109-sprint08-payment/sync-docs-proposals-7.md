# Sync-docs lần 7 — 12/11/2026

Task: `20261109-sprint08-payment`. Các đề xuất dưới đây chờ user duyệt; chưa sửa tài liệu đích. QA được dẫn là local do agent chạy, không phải CI độc lập. Sprint chưa được quyết định đóng.

## D-7 — `docs/architecture/TECH_STACK.md:23`
- Hiện tại: `UI xác thực, quản trị nền tảng và Cài đặt tổ chức dùng API thật; POS/ca/thực đơn/kho/báo cáo còn mô phỏng`
- Đề xuất: `UI xác thực, quản trị nền tảng, tổ chức, thực đơn, ca và POS/thanh toán dùng API thật; màn Hóa đơn và Báo cáo còn mô phỏng, Kho còn mô phỏng tab lịch sử biến động.`
- Bằng chứng: `README.md:9-10`; `POS_UI/src/app/App.tsx:77,88`; `POS_UI/src/features/pos/LivePosScreen.tsx:6,9,252`; `POS_UI/src/features/invoices/InvoicesScreen.tsx:4,33`; `POS_UI/src/features/reports/DailyReportScreen.tsx:5,7`.
- Lý do: POS/thanh toán đã nối API trong Sprint 08; câu hiện tại còn mô tả trạng thái trước khi triển khai.

## D-8 — `THIRD_PARTY_INTEGRATIONS.md:3`
- Hiện tại: `**chưa kiểm Live, Sprint 08 chưa nghiệm thu**`.
- Đề xuất: `**chưa kiểm Live; Sprint 08 đã QA cấp sprint trong phạm vi local, chưa quyết định đóng**`.
- Bằng chứng: `sprints/sprint-08/SPRINT.md:7,39-49`; `.devloopflow/verify/20261109-sprint08-payment/report-17.md` mục Kết luận. Giữ nguyên giới hạn SePay Test mode và không có CI độc lập trong cùng dòng.
- Lý do: QA cấp sprint local đã ghi; không suy ra đã đóng sprint hoặc kiểm Live.

## D-9 — `docs/BUSINESS_RULES.md:3`
- Hiện tại: `Các câu cũ trái quyết định này là lịch sử; code chưa được nghiệm thu.`
- Đề xuất: `Các câu cũ trái quyết định này là lịch sử; code Sprint 08 đã được QA cấp sprint trong phạm vi local, chưa có CI độc lập.`
- Bằng chứng: `sprints/sprint-08/SPRINT.md:39-49`; `.devloopflow/verify/20261109-sprint08-payment/report-17.md` mục Kết luận.
- Lý do: câu trạng thái code chưa nghiệm thu cũ hơn kết quả QA local, không đồng nghĩa nghiệm thu production.

## D-10 — `sprints/sprint-08/SPRINT.md:22-25`
- Hiện tại: cột `Trạng thái` của cả bốn item đều ghi `Chưa bắt đầu`.
- Đề xuất, theo thứ tự item: `Đã chốt spec và plan`; `Đã triển khai, QA local`; `Đã triển khai, QA local`; `Đã review và QA local; đã ghi Sprint Review`. Giữ trạng thái sprint chưa đóng tại dòng 7.
- Bằng chứng: `.devloopflow/approved/20261109-sprint08-payment.md`; `.devloopflow/verify/20261109-sprint08-payment/report-17.md`; `sprints/sprint-08/SPRINT.md:39-49,73-86`.
- Lý do: bảng backlog chưa phản ánh công việc đã ghi trong cùng hồ sơ.

## D-11 — `sprints/sprint-08/SPRINT.md:56`
- Hiện tại: `Tự xác nhận chuyển khoản qua webhook, thanh toán nhiều đợt, giảm giá thủ công, hoàn tiền một phần và tách/gộp bill không thuộc Sprint 08.`
- Đề xuất: `Thanh toán nhiều đợt, giảm giá thủ công, hoàn tiền một phần và tách/gộp bill không thuộc Sprint 08. Tự xác nhận chuyển khoản qua webhook đã được bổ sung theo quyết định ngày 09/11/2026 ở đầu tài liệu.`
- Bằng chứng: `sprints/sprint-08/SPRINT.md:3,79`; `POS_API/src/sales/sepay-webhook.controller.ts:7`; `specs/invoices.md`.
- Lý do: giữ ranh giới còn lại nhưng làm rõ webhook đã được thêm vào phạm vi.
