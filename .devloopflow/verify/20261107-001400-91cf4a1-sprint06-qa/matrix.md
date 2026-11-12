# Ma trận QA Sprint 6 trước khi chạy

Nguồn: `sprints/sprint-06/SPRINT.md` S6-01..S6-09; BR trong `docs/BUSINESS_RULES.md`; UI/source tại working tree `91cf4a1` dirty. Đây là QA cấp sprint riêng. Mọi vế cần artifact của chính lượt này.

| Tiêu chí | Tình huống | Artifact cần thu |
| --- | --- | --- |
| S6-01 | Ca chính mình OPEN tạo; manager/owner không có ca bị chặn; branch inactive; linkage DB | test integration, API/DB trước sau |
| S6-02 | DINE_IN/TAKEAWAY; table inactive/foreign; 2 create race; occupied từ OPEN | API/DB race, index, browser |
| S6-03 | HD+8, collision/retry, immutable, cross store/branch/admin | test collision, DB unique/check, API auth |
| S6-04 | add dòng riêng, patch/delete OPEN, inactive/foreign menu, sau cancel từ chối | API/DB/test |
| S6-05 | quantity/topping dương, price server, snapshot, price change, concurrent SUM | API/DB/test/race |
| S6-06 | tablet UI thật table/takeaway/open, reload, error/loading, session switch | browser snapshot/network/DB |
| S6-07 | transfer valid/busy/inactive/cross scope/race; preserve item/total | API/DB/browser |
| S6-08 | cancel reason, cashier allowed, actor denied, terminal, table release | API/DB/browser |
| S6-09 | close và force-close 409 code/DB unchanged; cancel then close 200 | API/DB/test |

PASS chỉ khi từng vế có bằng chứng. FAIL có hành vi sai. BLOCKED khi môi trường cản. NOT VERIFIED khi chưa đủ artifact. Kết quả runner đơn thuần không chứng minh mọi vế. DB sandbox riêng phải xác nhận trước mỗi run.
