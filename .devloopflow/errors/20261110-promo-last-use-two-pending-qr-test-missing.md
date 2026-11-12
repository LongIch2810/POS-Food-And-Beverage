---
id: 20261110-promo-last-use-two-pending-qr-test-missing
tags: [test, sales, promotion, transfer-attempt, race]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Thiếu test: mã khuyến mãi còn đúng một lượt khi có hai đơn cùng chờ QR (B-15)

## Triệu chứng
- Nguồn: review vòng 4 của task `20261109-sprint08-payment`, mục "Case test thiếu"; ghi backlog `B-15` (Low), trạng thái `đã sửa` (10/11/2026).
- `payment.integration.test.ts` (nhóm promo và QR chờ) chưa có test: khi mã còn một lượt và hai đơn cùng chờ QR dùng mã đó, chỉ một đơn được thanh toán; đơn còn lại giữ OPEN và báo ngoại lệ.
- Không có output lỗi: khoảng trống phủ test.

## Nguyên nhân gốc
- Ca cạnh tranh trên lượt cuối của mã chỉ được nêu ở mức RF-4 (`test_ST4_promo_race`, đường CASH); đường QR chờ với hai đơn chưa có ca riêng. Đã xác minh theo review vòng 4.

## Cách fix
- File và thay đổi: `POS_API/src/sales/tests/payment.integration.test.ts` — thêm subtest `[B-15] ...` kiểm `used_count` và số payment (không đổi code; theo ghi chú fix-backlog B-13..B-20, 10/11/2026).
- Test tái hiện: subtest `[B-15]`. Event id `7501` của ca này sau đó bị trùng với `[V3-2]` và được đổi sang `7551`/`7552`, xem `20261110-payment-test-event-id-collision.md` (B-24).

## Quy tắc phòng tránh
- Với tài nguyên có hạn mức (mã khuyến mãi), có ca test hai bên cùng dùng lượt cuối ở mọi đường thanh toán, kiểm bộ đếm và số bản ghi.

## Dấu hiệu nhận biết khi review
- Hạn mức dùng chung được kiểm ở một đường thanh toán nhưng không ở đường còn lại.
