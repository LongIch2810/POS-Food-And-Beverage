# Lỗi đọc sai kết quả UPDATE RETURNING trong API Sprint 07

**Trạng thái:** Đã sửa và kiểm chứng trên PostgreSQL sandbox. **Task:** [Sprint 07 implementation](../tasks/completed/2026-11-07-sprint-07-implementation.md). **Commit nền:** `5ada010f61d76ae5a0bf55a2224081513ad762bb`; sửa chưa commit.

## Triệu chứng và bước tái hiện

1. Trên PostgreSQL sandbox, tạo nguyên liệu rồi gọi `InventoryService.patchIngredient(...,{isActive:false})` trong test công thức/inactive.
2. Test đỏ tại `qa-evidence/20261107-sprint07-backend-check/review-green.log` (subtest PB-08) với `RangeError: Invalid time value` ở `InventoryService.ingredientView` sau câu UPDATE.
3. `PromotionsService.patch` dùng cùng mẫu `const [row] = manager.query('UPDATE ... RETURNING *')`, nên có cùng nguy cơ. Test HTTP và used-count lock đã bổ sung để kiểm chứng.

## Nguyên nhân

**Đã xác minh:** TypeORM PostgreSQL QueryRunner trả `result.raw = [raw.rows, raw.rowCount]` cho `UPDATE`/`DELETE` tại `POS_API/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js` quanh dòng 200; source service đã destructure phần tử đầu thành `row`, thực ra là mảng rows. Stack test đỏ nêu trên đi qua `ingredientView` rồi `new Date(row.created_at)` không hợp lệ.

## Cách sửa và kiểm chứng

- `InventoryService.patchIngredient` và `PromotionsService.patch`: lấy phần tử đầu `rows[0]` từ `[rows, rowCount]` sau UPDATE.
- Đã thêm kiểm tra PATCH ingredient/promotion qua HTTP và service trong `POS_API/src/inventory/tests/`.
- **Đã xác minh lượt xanh:** `cd POS_API; npm test` trên PostgreSQL sandbox PASS 74/74, `qa-evidence/20261107-sprint07-backend-check/review-fixed.log`; gồm service PATCH ingredient, PATCH promotion usedCount và HTTP PATCH cả hai route. Bằng chứng local do agent chạy, chưa có CI độc lập.
