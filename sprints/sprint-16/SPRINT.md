# Sprint 16 — Tách bill và Nghiệm thu tổng Giai đoạn 2

**Trạng thái:** Đề xuất ngày 18/11/2026, **chưa được Product Owner chốt**; chưa có spec, plan hay task.

**Nguồn:** [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-23 và lát cắt PB-13; [Business Rules](../../docs/BUSINESS_RULES.md) BR-117, BR-101, BR-39, BR-46; toàn bộ [Sprint 11..15](../sprint-11/SPRINT.md).

## Cơ sở và quyết định phạm vi

- PB-23 là thay đổi rủi ro cao vào lõi bán hàng (đơn, bàn, mã giảm giá, kho). Đặt **cuối** để mọi tính năng khác (giảm tay, giá vốn, báo cáo, PDF, gói) đã ổn định rồi mới tách bill, và còn chỗ để hồi quy.
- Phần còn lại của sprint dành cho nghiệm thu tổng Giai đoạn 2: ma trận quyền, gói, nhật ký, báo cáo và đồng bộ tài liệu.
- Gộp bill, chuyển bàn nâng cao đã bỏ (16/11/2026); sprint này chỉ tách bill.

## Sprint Goal

Thu ngân/quản lý/chủ cửa hàng tách một phần món của đơn bàn thành hóa đơn **mang đi** thanh toán riêng; bàn vẫn chỉ một đơn `OPEN`. Toàn bộ Giai đoạn 2 qua nghiệm thu tổng, tài liệu và hồ sơ khớp mã.

## Sprint Backlog và thứ tự thực hiện

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Spec PB-23 | Hợp đồng tách theo món và số lượng, mã lỗi, xử lý topping/ghi chú, gỡ mã giảm giá và giảm tay cả hai bên, ảnh hưởng ca/kho. | Chốt điểm mở. | Chưa bắt đầu |
| 2 | PB-23 — API tách bill | Tạo hóa đơn mang đi từ phần tách, cập nhật đơn gốc trong một transaction. | Spec. | Chưa bắt đầu |
| 3 | PB-13 — UI tách bill | Chọn món/số lượng tại màn bán hàng, xem hai hóa đơn, thanh toán riêng. | API item 2. | Chưa bắt đầu |
| 4 | Hồi quy và nghiệm thu tổng GĐ2 | Ma trận vai trò × gói × tính năng; hồi quy thanh toán/kho/đối soát/báo cáo; kiểm tài liệu và hồ sơ; Retrospective cho cả Giai đoạn 2. | Item 2–3 xong. | Chưa bắt đầu |
| 5 | Đồng bộ tài liệu | `docs/api-spec.md`, DB design, BR, README, `CLAUDE.md`/`AGENTS.md`, `TECH_STACK.md`, danh mục lỗi khớp mã. | Item 4. | Chưa bắt đầu |

## Tiêu chí nghiệm thu cấp Sprint 16

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S16-01 | Tách theo món và số lượng tạo hóa đơn mang đi `OPEN` riêng; số lượng/giá snapshot đúng; không tách hết (đơn gốc phải còn ít nhất một món theo spec) hoặc tách vượt số lượng. | BR-117 | Test PostgreSQL, HTTP, SQL đối chiếu tổng hai hóa đơn bằng tổng gốc. | ☐ |
| S16-02 | Bàn vẫn tối đa một đơn `OPEN`; hóa đơn mang đi tách ra không chiếm bàn; ràng buộc DB không bị nới. | BR-101; BR-117 | Thử tạo thêm đơn bàn, kiểm unique index. | ☐ |
| S16-03 | Mã giảm giá và giảm tay của cả hai hóa đơn bị gỡ, lượt dùng mã được trả đúng, áp lại thủ công được. | BR-117 | DB trước/sau, đếm lượt mã. | ☐ |
| S16-04 | Hai hóa đơn thanh toán độc lập, mỗi cái có `Idempotency-Key` và `work_shift_id`; kho trừ đúng một lần cho mỗi món; đối soát và báo cáo không đếm đôi. | PB-09; PB-10; PB-12 | Thanh toán lần lượt, replay, báo cáo/ca đối chiếu. | ☐ |
| S16-05 | Quyền `CASHIER`/`MANAGER`/`OWNER` tách bill đúng phạm vi ca/chi nhánh; cross-store và `PLATFORM_ADMIN` bị chặn; không tách đơn của ca khác. | BR-117; BR-77 | HTTP theo vai trò. | ☐ |
| S16-06 | UI tách bill dùng API thật, tiếng Việt, VND, tablet ngang cảm ứng; đổi phiên không lộ dữ liệu cũ. | PB-13 | Browser 1024×768, network đã che. | ☐ |
| S16-07 | Hồi quy tổng: ma trận quyền × gói × tính năng của Giai đoạn 2 đạt; bộ test API/UI đầy đủ xanh; không còn mục mở trong sổ FAIL các sprint 11–15. | Toàn GĐ2 | Báo cáo QA tổng, `npm test` API/UI, sổ FAIL. | ☐ |
| S16-08 | Tài liệu (API, DB, BR, README, danh mục lỗi, tech stack) khớp mã sau Giai đoạn 2; ghi rõ phần chưa kiểm (CI, production, thiết bị cảm ứng thật). | Quy tắc đồng bộ tài liệu | Diff tài liệu, đối chiếu mã. | ☐ |

## Ranh giới và điểm cần chốt trước code

1. Cách thao tác tách: chọn món và số lượng; món có topping/ghi chú tách cả dòng hay từng đơn vị.
2. Đơn gốc còn lại món nào thì được phép; có cho tách toàn bộ không (đơn gốc rỗng thì xử lý thế nào, hủy hay bị chặn).
3. Hóa đơn mang đi có gắn bàn nguồn để truy vết không (mã tham chiếu đơn gốc) dù không chiếm bàn.
4. Thời điểm tách có kèm điều kiện đơn đã gửi bếp hay có dòng chưa gửi hay không (chỉ nếu hệ thống hiện có khái niệm này; cần kiểm mã).

## Theo dõi planning

- Đề xuất lập ngày 18/11/2026; chưa được chốt. Nếu Product Owner muốn tách bill sớm hơn, nên giữ nó **sau** PB-24 để chỉ phải gỡ giảm tay một lần.
