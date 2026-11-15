# Kiểm AC cấp Sprint 10 — vòng 2

## Kết luận

**PASS.** Bảy AC cấp sprint (S10-01..06, S10-11) và hai mục mở của vòng 1 (V1-1, V1-2) đều PASS với chứng cứ mới. Không có FAIL mới.

- Ngày: 16/11/2026. Chế độ dùng rời, id `20261116-sprint10-qa`; nguồn AC `sprints/sprint-10/SPRINT.md:36–42`.
- Bản mã: nhánh `feat/sprint10-reports`, HEAD `19ef547`, working tree có thay đổi chưa commit. SHA256 288 file nguồn trước/sau không đổi: `evidence/r2-source-comparison.json`.
- Verifier không sửa source, test, backlog hay tài liệu nguồn; không commit.
- Report này do agent chính ghi lại từ kết quả của subagent `ac-verifier` (Write của subagent bị từ chối). Bằng chứng thô ở `evidence/r2-*` (có `r2-SHA256SUMS`).

## Kết quả từng AC

| AC | Kết luận | Chứng cứ chính |
|---|---|---|
| S10-01 | PASS | Hai mốc sát nửa đêm UTC+7 gom đúng ngày 13, 14, 15. Hủy sau thanh toán: tổng 85000 thành 50000, payment vẫn còn trong DB (`evidence/r2-before-after.json`, `evidence/r2-sandbox-http-results.json`). |
| S10-02 | PASS | Tiền mặt và chuyển khoản tách riêng, tổng bằng tổng hai phần. Tổng 9007199254740991 đúng; vượt một đơn vị trả 500 thay vì làm tròn. |
| S10-03 | PASS | 13 tổ hợp vai trò cùng ca/chi nhánh/store khác. Admin bị chặn dù đã gắn quyền báo cáo; không đăng nhập nhận 401 (`evidence/r2-A-browser-results.json`). |
| S10-04 | PASS | 7 cột biểu đồ đúng, ngày 02 là 0đ. Top 10 gộp cùng size khi đổi tên; TopMon 35.000đ gồm topping. Đơn hủy và đơn mở không tính; khớp SQL. |
| S10-05 | PASS | API thật ở 1024×768, tiền VND, không cuộn ngang; có trạng thái tải, rỗng, lỗi 500 và "Thử lại". Ngày xem V1-1. |
| S10-06 | PASS | Request cũ không ghi đè khi đổi chi nhánh. F5 giữ `/bao-cao`; đổi phiên sang owner_b không lộ dữ liệu cũ; admin mở `/bao-cao` bị chuyển `/cua-hang`, không có request dữ liệu. |
| S10-11 | PASS | SALE (-100) và SALE_REVERSAL (+100) cùng mã hóa đơn, thứ tự và ID khớp SQL; phân trang đủ 4 dòng. Cột Chi nhánh chỉ hiện khi xem tất cả. Có trạng thái rỗng, lỗi mạng, lỗi 500; quyền và cross-store đúng. |
| V1-1 | PASS | Chrome en-US và vi-VN: ba ô ngày hiện `14/11/2026`, `01/11/2026`, `07/11/2026` khi gõ phím thật. Request vẫn ISO (`date=2026-11-14`). Ngày sai `31/02/2026` báo lỗi. Ảnh đã mở xem trực tiếp. |
| V1-2 | PASS | Sau Back về `/thuc-don/kich-co` có 0 dialog; sau Forward về `/thuc-don/danh-muc` vẫn 0 dialog; mở lại bằng nút ra 1 dialog. |

## Lệnh đã chạy

- API: build `tsc` rồi `node --test --test-concurrency=1 dist/**/*.test.js` → 256/256 pass, exit 0 (lệnh tương đương `npm test`; gọi qua script QA lỗi đường dẫn `npm-cli.js`).
- POS_UI: `npm test` 230/230; `npm run typecheck` và `npm run build` exit 0.
- Browser test dự án: 37/37 pass (Chrome thật, `window.fetch` giả).
- `npm audit --audit-level=high`: exit 0 ở POS_API và POS_UI.
- Sandbox riêng (DB riêng, API 3100, Vite 5174): 21 case HTTP/SQL đạt, 10 case browser đạt, `browser-errors` rỗng; đã dọn, `remaining:0`. App/DB local ở 3000/5173/5432 không bị đụng.

## Ghi nhận (không phải FAIL)

- **O-1 (cần user quyết):** tiêu đề "Doanh thu ngày 14/11" và nhãn trục biểu đồ dùng `dd/MM` không có năm. `DESIGN.md:635` ghi `dd/MM/yyyy`, không nêu ngoại lệ cho nhãn ngắn. Vòng 1 thấy và không đánh FAIL; xếp "Tài liệu không quy định".
- **O-2:** `npm audit --omit=dev` ở POS_API báo 3 mức moderate (typeorm kéo glob/minimatch); không có high.
- Lỗi harness của verifier (không phải lỗi sản phẩm): lần gõ ngày đầu dùng triple-click làm lẫn chuỗi, đổi sang Ctrl+A; một assertion tiêu đề quá chặt đã sửa.

## Không kiểm / giới hạn

- Không có CI cho working tree chưa commit; không kiểm thiết bị cảm ứng thật, Safari/Firefox, SePay Live, production.
- Không dùng Playwright MCP; dùng Chrome qua `puppeteer-core` như vòng 1. Locale chỉ mô phỏng trên Chrome.
- B-67 không kiểm lại trong lượt này.
- Browser test dự án dùng fetch giả; tách khỏi sandbox API thật.
