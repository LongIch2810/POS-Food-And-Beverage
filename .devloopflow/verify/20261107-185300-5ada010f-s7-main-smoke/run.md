# Sprint 07 — kiểm tra thủ công do agent chính chạy

- Thời gian: 07/11/2026, khoảng 18:53–19:43 UTC+07.
- Commit nền: `5ada010f61d76ae5a0bf55a2224081513ad762bb`; working tree **dirty**, gồm code/tài liệu Sprint 07 trong task đang active. Đây là kiểm tra local của agent chính, không phải CI hay QA độc lập.
- Môi trường: UI Vite `localhost:5173`, API NestJS `localhost:3007`, PostgreSQL sandbox local trong container `pos_pb07_test_pg`, database riêng `pos_s7_ui_sandbox`. Không truy cập production. Migration chạy thành công; log: `../20261107-sprint07-backend-check/sandbox-migration.log`.
- Công cụ: Playwright browser thao tác UI thật; network request do browser ghi; truy vấn PostgreSQL `SELECT` chỉ đọc để đối chiếu tác dụng phụ. Các file bên dưới là artifact tại lúc chạy. Không lưu cookie, token, mật khẩu hay chuỗi kết nối.

| Tình huống | AC task / tiêu chí sprint để đối chiếu | Thao tác và expected → actual | Artifact gốc |
| --- | --- | --- | --- |
| S7-MAIN-01 | AC-1 / S7-01 | Tạo nguyên liệu “Đường QA S7” qua UI; expected POST thành công và một bản ghi trong DB → POST 201, UI hiện tên, DB count 1. | `inventory-after.yml`, `inventory-after.png`, `network.txt`, `db-after.txt` |
| S7-MAIN-02 | AC-5, AC-7 / S7-05, S7-07 | Tạo mã `S7DEMO10` PERCENT 10 qua UI, reload, rồi tắt; expected mã được lưu, sau reload còn hiện và trạng thái inactive lưu DB → POST 201, UI hiển thị sau reload, DB `active=false`, `used_count=0`. | `promotion-after.yml`, `promotion-after.png`, `promotion-network.txt`, `promotion-db-after.txt`, `promotion-reload.yml`, `promotion-disabled.yml`, `promotion-network-2.txt`, `promotion-db-disabled.txt` |
| S7-MAIN-03 | AC-3, AC-7 / S7-03, S7-07 | Đặt ngưỡng tồn 5.5 qua UI; expected tồn vẫn 0, UI báo dưới ngưỡng, không tạo movement → PATCH 200, DB `current=0.000`, `min=5.500`, `movement_count=0`. | `stock-min-after.yml`, `stock-min-after.png`, `stock-network.txt`, `stock-db-after.txt` |
| S7-MAIN-04 | AC-2, AC-4, AC-7 / S7-02, S7-04, S7-07 | Tạo sản phẩm/size thử trên sandbox, mở RecipeModal, gán 2.5 nguyên liệu và reload; expected công thức lưu, chưa đổi tồn → PUT 200, DB recipe `2.500`, tồn `0.000`, movement count 0. | `recipe-before.yml`, `recipe-after.yml`, `recipe-network.txt`, `recipe-db-after.txt`, `recipe-reload.yml`, `recipe-stock-unchanged.txt` |
| S7-MAIN-05 | AC-7 / S7-07 | Chặn giả lập GET ingredients bằng phản hồi 503 trong Playwright, mở Kho; expected UI báo lỗi và có nút thử lại → alert hiển thị “Không kết nối được kho thử” và “Thử lại”. Đã gỡ route giả lập ngay sau chụp. Đây chỉ là bằng chứng nhánh lỗi UI, không phải lỗi backend thật. | `inventory-error.yml` |

Các tình huống trên chỉ kiểm tra một phần hành vi. Chưa thu đủ artifact cho mọi vế AC-1..7 (đặc biệt phân quyền/tenant, nhiều chi nhánh, eligibility biên, regression toàn luồng UI và QA độc lập). **Kết luận task AC-1..7: NOT VERIFIED** trong lượt này. Không kết luận PASS cho S7-01..07; QA cấp sprint phải chạy riêng sau QA task.

## Lệnh regression cùng phiên

- `cd POS_API; npm test`: exit 0, 74 pass, 0 fail; `../20261107-190000-5ada010f-s7-main-regression/backend.log` và `../20261107-190000-5ada010f-s7-main-regression/run.md`.
- `cd POS_UI; npm test`: exit 0, 40 pass, 0 fail; `../20261107-sprint07-backend-check/ui-final.log`.
- `cd POS_UI; npm run build`: exit 0; `../20261107-190000-5ada010f-s7-main-regression/ui-build.log`.
