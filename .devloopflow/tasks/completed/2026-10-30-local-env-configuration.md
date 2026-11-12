# Trạng thái: Hoàn tất

- Mục tiêu: Backend/frontend có .env riêng khi chạy ngoài Docker; bỏ URL backend fallback trong source Vite; giữ API cùng origin qua proxy.
- Nhánh: fix/local-env-configuration, từ master64441b2 sau fetch/pull --ff-only; working tree sạch lúc bắt đầu.
- Nguyên nhân đã xác minh: POS_API có .env.example nhưng Node scripts không nạp .env; POS_UI thiếu file mẫu và vite.config.ts chỉ đọc process.env, fallback127.0.0.1:3000. UI gọi /api/v1 cùng origin, Compose đã cấp VITE_API_TARGET=http://api:3000.
- Phạm vi: POS_API/package.json/.env.example/README.md; POS_UI/vite.config.ts/.env.example/.gitignore/.dockerignore và test config; README gốc. Tạo .env local ignored từ cấu hình local hiện có, không ghi giá trị secret ra log/Git.
- Quyết định: Dùng --env-file-if-exists của Node22 đã kiểm tra trong node --help, không thêm dotenv. Vite loadEnv đọc env theo mode, shell env được ưu tiên; dev thiếu target báo lỗi cấu hình; build không cần backend đang chạy. Không đưa URL tuyệt đối vào browser fetch.
- Đã làm: regression đỏ expected43210/actual3000, sửa và green; native Node env flags, Vite loadEnv, bỏ URL fallback; thêm mẫu/ignore frontend và docs. POS_API/.env/POS_UI/.env đã tạo từ cấu hình local hiệu lực, không ghi đè env có sẵn hoặc in secret. Hai file đều ignored Git/Docker.
- Kiểm chứng: API7/7, UI11/11, build UI exit0; đã xóa biến DB/auth khỏi shell để npm test dùng .env. Startup theo script start dùng .env, health200 đúng body; cổng tạm và dừng child sau kiểm tra. Reviewer không có finding.
- Bước tiếp: Người dùng sử dụng .env local và xem diff trên fix/local-env-configuration; chưa commit/push. Không còn triển khai trong task.
- Bằng chứng: qa-evidence/2026-10-30-112626-64441b2-env/run.md, results.json, log runner/khởi động gốc, final-checks.json; errors/2026-10-30-local-env-loading.md.
- MEMORY: Không thêm; lưu nguyên nhân/sửa/test trong error thay vì lặp quy tắc cấu hình và chứng cứ đã có.

## Ma trận trước kiểm chứng

| Tiêu chí | Test/kiểm tra | Artifact |
| --- | --- | --- |
| Proxy đọc .env, env shell override và không fallback URL trong source | Vite config test chạy child process ở fixture env riêng, đỏ→xanh | qa-evidence/2026-10-30-112626-64441b2-env/ |
| Backend scripts nạp .env trước DataSource/auth config | npm test trong shell đã bỏ các biến app, startup smoke dùng .env | Output test/smoke đã che giá trị |
| UI service auth/platform không đổi | Bộ test UI và build | stdout/stderr runner |
| Env local không vào Git/image frontend | git check-ignore và Docker ignore config | Check output, chỉ tên file |

- Không đổi business rule/schema/dependency. Không commit/push nếu chưa có yêu cầu cho thay đổi mới.
- Tích hợp: Người dùng đã kiểm tra việc ignore .env và yêu cầu commit/push; đưa thay đổi lên master theo cách đã chốt trong phiên. Chỉ stage file mẫu và mã/tài liệu/chứng cứ thuộc task, giữ hai .env thật ngoài Git.
