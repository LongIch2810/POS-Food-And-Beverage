**Trạng thái:** lượt chạy lại đúng npm test đã qua48/48; không sửa code hoặc nới timeout. Nguyên nhân sâu của lượt cleanup timeout đầu chưa xác minh.

# Timeout khi dọn DB foundation trong lượt regression PB-13

- Run: `qa-evidence/20261101-203100-9ce75dd-pb13-final/`; api-tests.log thực48 TAP nodes,47pass1fail.
- Failure PB-01 migration/bootstrap/constraints tại dist/foundation.test.js:188 tương ứng finally DROP DATABASE WITH(FORCE), PostgreSQL57014 statement timeout. Không phải assertion pg_sleep và không phải lỗi endpoint PB13 đã tái hiện.
- DataSource đặt statement_timeout/query_timeout5000ms. Lượt này chạy cùng browser QA; chưa có bằng chứng xác định lock/I/O hay tải là nguyên nhân sâu, không gọi giả thuyết là kết luận.
- Giữ raw failure và server log đã lọc riêng statement timeout/DROP/pg_sleep; chạy lại đúng npm test sau khi browser đã đóng, không nới timeout/bỏ assertion hoặc sửa backend ngoài scope để biến đỏ thành xanh.
- Kiểm chứng: api-tests-2.log bắt đầu01/11/2026 20:40:44.7453429+07, kết thúc20:43:07.4939125+07, exit0,48pass0fail/skip/cancel. Raw lần đầu giữ nguyên. Không gọi việc chạy lại qua là đã sửa một lỗi production hoặc chứng minh giả thuyết tải/lock/I/O; ghi nhận như giới hạn của lượt QA local.
