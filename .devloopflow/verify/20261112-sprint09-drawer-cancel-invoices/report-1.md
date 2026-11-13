> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Kiểm AC report 20261112-sprint09-drawer-cancel-invoices — vòng 1

## Kết luận
PASS

- Ngày: 2026-11-13
- Nhãn nguồn bằng chứng: **local do agent chạy** (không phải CI/runner độc lập, không SePay Live, không production).
- Plan đối chiếu: `.devloopflow/approved/20261112-sprint09-drawer-cancel-invoices.md`
- Spec đối chiếu: `.devloopflow/specs/20261112-sprint09-drawer-cancel-invoices.md`
- Ghi chú ghi chép: subagent `ac-verifier` (sonnet) không ghi được `report-1.md`/`fails.md` (công cụ Write từ chối trong ngữ cảnh subagent); agent chính chép nội dung từ report của subagent sau khi tự đối chiếu bằng chứng thô (xem "Kiểm lại của agent chính").
- Phiên bản đã kiểm: HEAD `abc6bee5dceac7219ea8d569272009daa29719d3`, nhánh `feat/sprint-09-drawer-cancel`; mã task A **chưa commit** (working tree dirty, `evidence/v1/git-status.txt`, `git-diff-stat.txt`). SHA-256 gộp 122 file `dist/**/*.js` = `368fd20cab885de382ebe9246f0bc414e8f9d0ce5f5ff8d0e64c00025ec8a1d5` (tính lại sau build vẫn đúng); hash từng file nguồn đã đổi: `evidence/v1/src-sha256.txt`.

## Tài liệu nguồn đã đối chiếu
- `docs/BUSINESS_RULES.md`: BR-17 (`:107`) "Ca `CLOSED` không tạo đơn, không thanh toán, không thêm chi phí, không sửa số liệu..."; BR-51 (`:117`) "Chỉ ghi chi phí khi ca còn `OPEN`."; BR-52 (`:118`) "Mỗi khoản chi có `amount > 0` và `reason` bắt buộc."; BR-53 (`:119`) "Chỉ khoản có `paid_from_drawer = true` mới trừ vào tiền kỳ vọng của két."; BR-58 (`:132`) "**Đếm mù**: khi đóng ca, thu ngân nhập `counted_cash` trước, hệ thống mới trả `expected_cash` và `difference`..."; BR-60 (`:134`); BR-61 (`:135`) "Các cột snapshot (`cash_sales_amount`, `expense_amount`, `expected_cash`) lưu lúc đóng ca và không đổi nữa."; BR-29 (`:150`) "Hủy đơn `PAID`: cần quyền quản lý, bắt buộc có lý do, và chỉ khi **ca của đơn đó còn mở**..."; BR-39 (`:175`) "`used_count` tăng khi hóa đơn dùng mã thành `PAID`. Đơn `PAID` bị hủy thì trả lại một lượt."; BR-47 (`:188`) "Hủy đơn `PAID` thì thêm dòng `SALE_REVERSAL` cộng trả kho, không xóa dòng `SALE` cũ."; ma trận quyền (`:229`) "Hủy đơn đã thanh toán ... Không Có Có Không"; công thức đối soát (`:273-277`).
- `docs/DESIGN_DB_POS_SYSTEM.md:494-504` (bảng `shift_expenses`), `:639` (hủy đơn `PAID`).
- `docs/api-spec.md:349,353,361,362,375,456`.
- `sprints/sprint-09/SPRINT.md` S9-01..S9-05; `.devloopflow/specs/20261112-sprint09-drawer-cancel-invoices.md`.

## Môi trường
- Lệnh chạy app: `npm run migration:run` rồi `npm run start` trong `POS_API/`, trên DB sandbox `pos_verify_s9_681dfb23a7` (PostgreSQL 17.9 Docker `pos_infra-postgres-1` cổng 15432); API cổng 13091; đã dừng API và `DROP DATABASE ... WITH (FORCE)` (`evidence/v1/cleanup.txt`).
- Secret của phiên tự sinh, không ghi vào bằng chứng.

## Kết quả test
- Lệnh: `npm test` trong `POS_API/` với `DATABASE_URL` dựng từ `POS_INFRA/.env.local` (cổng 15432).
- Output thật: `evidence/v1/npm-test.log`: `# tests 199`, `# pass 199`, `# fail 0`; 43 dòng `ok` mang mã `[S9-xx][ST-n.AC-k]` (`evidence/v1/ac-test-ok-lines.txt`).
- Kịch bản HTTP bằng app thật (E2E-AC-1..5, RF-1..5 + 2 case phụ): `evidence/v1/e2e-http.log`, `e2e-http.results.json`: 42/42 check PASS.

## Coverage
- Không có lệnh coverage trong dự án (`.devloopflow/devloopflow.md` mục 2).

## Đã đối chiếu errors
- `20261113-cancel-open-scope-order-untested.md` (R1-1; đủ mục template + dòng INDEX)
- `20261109-cash-close-shift-zero-cash-sales.md`, `20261111-cash-reconciliation-exceeds-money-limit.md`, `20261111-manager-cancel-open-behavior-untested.md`, `20261109-owner-access-all-branch-scope.md`, `20261110-backlog-branch-scope-null-branchid-fail-open.md`

## Bảng đối chiếu (MỌI AC trong plan)
Ký hiệu: NT = dòng `ok` trong `evidence/v1/npm-test.log`; HTTP = check trong `evidence/v1/e2e-http.log`.

| AC | Cách kiểm | Bằng chứng thật | Kết luận |
|---|---|---|---|
| E2E-AC-1 | HTTP + NT | HTTP `E2E-AC-1.*` (POST 201, GET `meta {20,null,1}`, PLATFORM_ADMIN 403, ca đóng 409 `SHIFT_CLOSED`); NT ST-2.AC-1, 7, 8, 9 | Đúng |
| E2E-AC-2 | HTTP + NT | HTTP `E2E-AC-2.*` (đóng thường `expectedCash 120000` `MATCHED`; cưỡng chế `difference 5000` `OVERAGE`; trước đóng `expectedCash null`); NT ST-3.AC-1, 3 | Đúng |
| E2E-AC-3 | HTTP + NT | HTTP `E2E-AC-3.*` (MANAGER 200; CASHIER 403; admin 403; MANAGER chi nhánh khác 404; OWNER store khác 404; ca đóng 409 `CANCEL_NOT_ALLOWED`); NT ST-4.AC-1, 3, 5 | Đúng |
| E2E-AC-4 | HTTP + NT | HTTP `E2E-AC-4.*` (`payments` không đổi; 2 `SALE_REVERSAL` +200 và +40; tồn 1000/1000; `used_count` 1→0; trigger lỗi → 500 không đổi; 2 hủy đồng thời `[200,409]`, 2 phiên chờ khóa); NT ST-4.AC-1, 10, ST-5.AC-1 | Đúng |
| E2E-AC-5 | HTTP + NT | HTTP `E2E-AC-5.cash` (`cashSales 0`, `expectedCash 100000`), `.transfer` (`cashSales 50000`, `expectedCash 150000`, `cancel_reason` nguyên văn); NT ST-5.AC-2, 3 | Đúng |
| ST-1.AC-1 | NT ok 1; `migration-run.log` (11 migration) | Đúng |
| ST-1.AC-2 | NT ok 2 | Đúng |
| ST-1.AC-3 | NT ok 3 | Đúng |
| ST-2.AC-1..4 | NT ok 4, 5, 6, 7 | Đúng |
| ST-2.AC-5 | NT ok 8; HTTP `RF-2.expense_details` | Tài liệu không quy định (mã `EXPENSE_EXCEEDS_DRAWER` do user duyệt) |
| ST-2.AC-6 | NT ok 9; HTTP RF-5 | Đúng |
| ST-2.AC-7..12 | NT ok 10..15; HTTP `RF-1.expense_uppercase` | Đúng |
| ST-3.AC-1..5 | NT ok 16..20 | Đúng |
| ST-3.AC-6 | NT ok 21; HTTP `EXP.expense_then_close` (`w1=1 w2=2`, chi 201, đóng 200 `expenseAmount 30000`) | Đúng |
| ST-4.AC-1..6 | NT | Đúng |
| ST-4.AC-7 | NT; HTTP `RF-2.cancel_details` (`details []`, message không có số) | Tài liệu không quy định (mã `CANCEL_EXCEEDS_DRAWER` do user duyệt) |
| ST-4.AC-8..15 | NT; HTTP `RF-1.cancel_uppercase`, `RF-3`, `RF-4`, `EXP.used_count_zero_500`, `EXP.cashier_cancel_open` | Đúng |
| ST-5.AC-1..3 | NT; HTTP race và E2E-AC-5 | Đúng |
| ST-5.AC-4, 5 | NT (`waitLock(1)`, `waitLock(2)` quan sát phiên chờ khóa thật) | Đúng; chỉ có chứng cứ từ NT, chưa chạy HTTP thật cho hai thứ tự này |
| RF-1..5 | HTTP `RF-1..5.*` đều PASS | Đúng |

Ghi chú: "Tài liệu không quy định" cho ST-2.AC-5 và ST-4.AC-7 vì hai mã lỗi mới do user duyệt ở phiên này chưa có trong `docs/api-spec.md`; kết quả khớp plan và spec đã duyệt, không đánh FAIL.

## Đối chiếu spec
| Mục của spec | Loại | Bằng chứng | Kết luận |
|---|---|---|---|
| G1 bảng và API ghi/xem chi từ két (S9-01) | mục tiêu | E2E-AC-1, ST-2 | Đúng |
| G2 đóng ca/đóng cưỡng chế dùng tổng chi, đếm mù, ghi chú khi lệch (S9-02) | mục tiêu | E2E-AC-2, ST-3 | Đúng |
| G3 hủy `PAID` theo BR-29: quyền, lý do, ca còn mở, phạm vi (S9-03) | mục tiêu | E2E-AC-3, ST-4 | Đúng |
| G4 hủy `PAID` một transaction, hoàn kho, trả lượt mã, rollback, đồng thời (S9-04) | mục tiêu | E2E-AC-4, ST-4, ST-5 | Đúng |
| G5 đơn CASH hủy rời `cash_sales_amount`; TRANSFER không ảnh hưởng két (S9-05) | mục tiêu | E2E-AC-5, ST-5 | Đúng |
| UI task B, sửa/xóa khoản chi, hủy ca đã đóng, hoàn tiền một phần, `IMPORT`/`WASTE`/`ADJUST`, báo cáo | phi mục tiêu | controller chỉ thêm `POST` và `GET :id/expenses`; không file `POS_UI/` đổi; ca đóng bị 409 `CANCEL_NOT_ALLOWED` | Đúng (không làm thừa) |
| Trả `expected_cash` trước khi nhập `counted_cash`; snapshot đổi sau đóng; sửa/xóa `payments`/`SALE`; ghi dở; trừ hai lần lượt mã; PLATFORM_ADMIN/khác phạm vi chạm dữ liệu | phản mục tiêu | `expectedCash null` trước đóng; ST-3.AC-5; ST-4.AC-1/10/11; ST-5.AC-1; 403/404 các ca phạm vi | Đúng (không rơi vào) |
| Tiền `bigint` có trần; migration chỉ thêm mới; khóa dòng gốc, không `LEFT JOIN ... FOR UPDATE`; UUID chuẩn; quyền qua HTTP | ràng buộc | migration CHECK; `down()` ném lỗi; grep khóa; test `randomUUID()` | Đúng |

## FAIL / bug
- Không có.

## Lệch tài liệu
- Không có lệch bị đánh FAIL. Ghi nhận cho `sync-docs`:
  1. `EXPENSE_EXCEEDS_DRAWER`, `CANCEL_EXCEEDS_DRAWER`, `SHIFT_NOT_FOUND`, `FORBIDDEN_NOT_SHIFT_OWNER`, permission `shift.expense`, `invoice.cancel_paid` chưa có trong `docs/api-spec.md` và `docs/BUSINESS_RULES.md` (plan ghi việc này thuộc `sync-docs`, M-4).
  2. `sprints/sprint-09/SPRINT.md:33` (S9-01) "Người có quyền ghi khoản chi cho ca `CASHIER` đang `OPEN` cùng store/branch"; spec đã duyệt thu hẹp: chỉ ca của chính người gọi, người khác nhận 403 `FORBIDDEN_NOT_SHIFT_OWNER`. SPRINT là dự thảo; xếp "Tài liệu không quy định".
  3. BR-58 (`:132`): hai mã vượt két cho phép dò ngưỡng tiền kỳ vọng bằng thử nhiều số; rủi ro mềm plan đã ghi, user đã duyệt; `details []` và message không số giảm rủi ro (RF-2 đạt).

## Đánh giá test
- Test tích hợp PostgreSQL thật qua HTTP, assert theo giá trị cụ thể; ổn định (3 lần liên tiếp xanh khi `tdd` chạy, 2 lần khi agent chính chạy). Đã biết khoảng trống (hoãn): tiebreak `e.id DESC`, `.trim()` thừa, `cashSales` bỏ `p.method='CASH'`, fixture TRANSFER dạng SYSTEM, MANAGER `branch_id NULL` hủy `PAID`, cặp `payCash`/`cancelPaid` đồng thời.

## Exploratory
- Đóng ca không còn hằng 0: grep `expense_amount|expenseAmount` không còn `0n`/`'0'` (`shifts.service.ts:324,334,413,419`).
- Vượt trần tiền đối soát: chi và hủy kiểm két dưới khóa ca; HTTP chi↔đóng ca đồng thời ra `expenseAmount 30000`.
- `branch_id NULL` (M-1): chi vào ca chi nhánh khác 404 `SHIFT_NOT_FOUND`; hủy đơn 404 `NOT_FOUND`.
- Hủy `OPEN` và đổi ưu tiên lỗi (R1-1): `[R1-1]` ok; CASHIER hủy `OPEN` vẫn 200.
- MEMORY: M-10, M-14, M-15, M-19, M-20, M-21 đạt; M-4 ghi nhận cho `sync-docs`.

## Kiểm lại của agent chính
- Mở `evidence/v1/`: có đủ `npm-test.log` (`# tests 199 / # pass 199 / # fail 0`), `ac-test-ok-lines.txt` (43 dòng `[S9-`), `e2e-http.results.json` (42 mục, 0 mục `pass:false`), `cleanup.txt` (sandbox DB đã drop), `head.txt` (`abc6bee…`); không thấy URL/mật khẩu hoặc cookie ở dạng rõ trong bằng chứng (chỉ có cursor phân trang base64 và biến `$POSTGRES_*` chưa thay trong script).
- Đã chạy `npm test` riêng: 199/199 exit 0 (2 lần sau vòng sửa 1).

## Đề xuất
- Dọn 2 DB do test trước để lại (`pos_s9_cancel_e279a82803c6`, `pos_s9_cancel_da73aac86fb8`) khi user cho phép; không phải việc của task.
- ST-5.AC-4/5 chỉ có chứng cứ từ `npm test`; chạy thêm HTTP thật nếu muốn bằng chứng độc lập hơn.
- CI GitHub Actions chưa chạy cho mã này (chưa commit/push).
