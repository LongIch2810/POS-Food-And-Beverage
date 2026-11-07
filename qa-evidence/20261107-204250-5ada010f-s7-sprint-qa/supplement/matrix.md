# AC-7 / S7-07 supplement: ma trận lập trước khi chạy

Nguồn: `tasks/active/2026-11-07-sprint-07-implementation.md` AC-7; `sprints/sprint-07/SPRINT.md` S7-07; `specs/inventory.md`, `specs/promotions.md`, PB-13. HEAD dự kiến `5ada010f61d76ae5a0bf55a2224081513ad762bb`; working tree dirty, ghi lại bằng file riêng khi chạy. Chỉ sandbox `pos_s7_ui_sandbox`.

| ID | Điều kiện và thao tác | Expected | Artifact cần lưu |
|---|---|---|---|
| UI-ING-CREATE | OWNER A, nguyên liệu mới; mở modal và lưu | Dòng mới xuất hiện và tồn DB sau reload | UI modal/trước/sau/reload screenshot + DOM, network POST/GET, DB SELECT trước/sau |
| UI-ING-EDIT | Dòng mới; mở sửa, đổi tên | Tên mới hiện và tồn DB | modal/trước/sau screenshot + DOM, network PATCH/GET, DB SELECT |
| UI-ING-INACTIVE | Dòng mới; bấm Ngưng dùng | Badge ngưng dùng sau reload và DB inactive | trước/sau/reload screenshot + DOM, network PATCH/GET, DB SELECT |
| UI-MIN | OWNER A, branch test; mở Đặt ngưỡng tồn và lưu | Ngưỡng theo branch hiện sau reload, DB đúng | modal/trước/sau/reload screenshot + DOM, network PATCH/GET, DB SELECT |
| UI-PROMO-ERROR | OWNER A, mock 503 cho GET promotions trong browser, retry khi bỏ mock | Error tiếng Việt và retry trả list thật | trạng thái trước/lỗi/sau screenshot + DOM, network method/path/status/request ID; ghi rõ mock chỉ chứng minh UI |

Trạng thái mỗi ID chỉ được quyết sau khi kiểm file gốc; kết luận task/sprint được ghi riêng trong `run.md` supplement.
