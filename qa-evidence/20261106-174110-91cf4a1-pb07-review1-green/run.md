# PB-07 backend after review round 1

- Nguồn chạy: local do agent chính thực hiện, chưa có CI độc lập.
- HEAD: `91cf4a1`; working tree dirty, gồm code PB-07 chưa commit và tài liệu Sprint 6 từ baseline.
- Môi trường: PostgreSQL 17 trong container sandbox `pos_pb07_test_pg`, chỉ bind loopback cổng 5433. `DATABASE_URL` được trỏ tới DB sandbox cho process test; không lưu giá trị trong artifact.
- Bắt đầu: 2026-11-06 17:41:10 +07:00 (thời điểm tạo log).
- Kết thúc: 2026-11-06 17:45:29 +07:00 (thời điểm ghi log cuối).
- Lệnh: tại `POS_API/`, đặt `DATABASE_URL` tới DB sandbox rồi chạy `npm test`, chuyển stdout/stderr nguyên gốc vào `backend-test.log`.
- Exit code: 0. Runner: 68 test, 68 pass, 0 fail; xem phần cuối `backend-test.log.gz` (nén gzip lossless từ log gốc). File `.log` lớn giữ local và được Git bỏ qua.
- Tình huống liên quan: test `PB-07 BR-16/22/24/26/74/75/90/92 invoices on PostgreSQL` trong log kiểm UUID topping viết hoa, FK topping đã bán, cancel khi branch inactive, và khóa branch/table khi tạo đơn. Các suite cũ cũng chạy hồi quy.
- Giới hạn: kết quả local và trực tiếp ở service; chưa thay thế QA HTTP/browser/DB độc lập theo AC.
