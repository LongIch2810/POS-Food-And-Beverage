# Sổ FAIL cấp Sprint 10 — 20261116-sprint10-qa

- Task: không có task QA riêng; chế độ dùng rời, nguồn AC là `sprints/sprint-10/SPRINT.md:36–42`.
- Cập nhật lần cuối: 2026-11-16 (sau lần verify-ac thứ 3, `report-3.md`).
- Điều kiện nghiệm thu: không còn mục `mở` thuộc yêu cầu hiện hành và có chứng cứ mới đạt đủ mọi vế S10-01..06/S10-11 trên bản mã cuối. Không dùng PASS task lịch sử để đóng sổ này.
- Branch/HEAD: `feat/sprint10-reports`, `19ef547292ecf0ef0586f9c466d34ceb7478dd46`, working tree có thay đổi chưa commit. Hash 288 file đầu/cuối không đổi: `evidence/r1-source-comparison.json`.

## Tổng hợp

| Id | AC | Loại | Trạng thái | Phát hiện ở lần | PASS ở lần | Report | Bằng chứng |
|---|---|---|---|---|---|---|---|
| V1-1 | S10-05, định dạng ngày DESIGN/Product Overview | Sai | đã PASS | 1 | 2 | report-1.md | evidence/r1-completion-report-tablet-summary.png |
| V1-2 | Cấp spec router L4, exploratory B-66 | Sai | đã PASS | 1 | 2 | report-1.md | evidence/r1-final-B66.json; evidence/r1-final-B66-dialog-after-back.png |

- Loại: Sai / Spec / Lệch tài liệu / Không có chứng cứ / Môi trường / errors thiếu.
- Trạng thái: `mở` / `đã PASS` / `huỷ do đổi plan/spec`. Lần 2 và lần 3: cả hai mục `đã PASS`, không có FAIL mới, không có mục huỷ. Bằng chứng lần 3: `evidence/r3-*`.

## Chi tiết từng FAIL

### V1-1 — S10-05: native date hiển thị MM/DD/YYYY

- Phát hiện ở lần: 1; report `.devloopflow/verify/20261116-sprint10-qa/report-1.md`.
- Loại: Sai; không phải mâu thuẫn giữa hai tài liệu nguồn.
- Kỳ vọng theo sprint/plan (nguyên văn): S10-05 “UI Báo cáo dùng API thật, không lấy mock làm nguồn dữ liệu; ngày/chi nhánh/ca phù hợp quyền, hiển thị tiền VND và tiếng Việt, có trạng thái tải/rỗng/lỗi rõ ràng trên tablet ngang.” (`sprints/sprint-10/SPRINT.md:40`). Reports plan E2E-AC-5 yêu cầu “VND/tiếng Việt” và tablet1024×768 theo DESIGN.
- Tài liệu nguồn (nguyên văn, path:dòng): “Số tiền định dạng `29.000đ`, ngày `dd/MM/yyyy`, giờ 24 giờ.” (`docs/PRODUCT_OVERVIEW.md:214`); dòng `Ngày` trong `DESIGN.md:635` quy định `dd/MM/yyyy`, ví dụ `27/10/2026`. Nguồn được đọc không quy định ngoại lệ locale cho native date.
- Thực tế: trên Chrome QA1024×768, ô Ngày báo cáo là `11/14/2026`; hai ô range là `11/01/2026`, `11/07/2026`. Nhãn và tiền VND đúng; query/API date ISO đúng. Screenshot đã được mở xem trực tiếp, không suy từ `.value`.
- Bước tái hiện: chạy source UI hiện tại; browser có định dạng ngày native như Chrome QA mặc định; ownerA mở `/bao-cao`, chọn date2026-11-14/range2026-11-01..07; nhìn thứ tự tháng/ngày trong ba input. Có thể dựng lại sandbox bằng script trong evidence; không cần hoặc được đổi mật khẩu fixture local.
- Path bằng chứng: `evidence/r1-completion-report-tablet-summary.png`; `evidence/r1-completion-browser-results.json`; `evidence/scripts/r1-browser-completion.cjs`; bản mã qua SHA256 source-pre/source-post.
- Test tái hiện đề xuất: `S10-05 displayed report dates follow dd/MM/yyyy across browser locales` | input: browser locale en-US và vi-VN, date14/11/2026, range01..07/11 | kết quả mong đợi: phần ngày người dùng nhìn thấy theo DESIGN, query vẫn ISO, không làm đổi gom ngày UTC+7. Nếu user duyệt dùng native locale, cần thay đổi yêu cầu có changelog trước; verifier không tự miễn trừ.
- Trạng thái: đã PASS (lần 2).
- Lịch sử trạng thái: 2026-11-16 — lần1 — FAIL — `evidence/r1-completion-report-tablet-summary.png`; không sửa hoặc kiểm lại sau kết luận này.
- Lịch sử trạng thái: 2026-11-16 — fix-verify — bản sửa V1-1 đã qua test/browser/build của agent chính, chưa có `verify-ac` mới; giữ `mở`.
- Lịch sử trạng thái: 2026-11-16 — lần 2 — PASS — `evidence/r2-V-en-US-V1-1-report.png`, `evidence/r2-V-vi-VN-V1-1-report.png`, `evidence/r2-V-en-US-browser-results.json`, `evidence/r2-V-vi-VN-browser-results.json`, `evidence/scripts/r2-v.cjs`. Chrome `--lang`/navigator en-US (native mẫu `11/14/2026`) và vi-VN (`14/11/2026`): ba ô là `type=text`, placeholder `dd/MM/yyyy`, giá trị gõ phím thật `14/11/2026`, `01/11/2026`, `07/11/2026`; request API `date=2026-11-14&fromDate=2026-11-01&toDate=2026-11-07` (ISO); ngày sai `31/02/2026` báo "Ngày báo cáo không hợp lệ."; `15/11/2026` gửi `date=2026-11-15`. Ảnh đã mở xem trực tiếp.
- Lịch sử trạng thái: 2026-11-16 — lần 3 — PASS (hồi quy) — `evidence/r3-V-en-US-browser-results.json`, `evidence/r3-V-vi-VN-browser-results.json`, `evidence/r3-A-report-tablet-summary.png`. Ba ô ngày vẫn `14/11/2026`, `01/11/2026`, `07/11/2026` (en-US và vi-VN), request ISO; tiêu đề `Doanh thu ngày 14/11/2026`.
- Lịch sử trạng thái: 2026-11-16 — lần 3 — PASS (hồi quy) — `evidence/r3-V-en-US-browser-results.json`, `evidence/r3-V-vi-VN-browser-results.json`, `evidence/r3-A-report-tablet-summary.png`. Ba ô ngày vẫn `14/11/2026`, `01/11/2026`, `07/11/2026` (en-US và vi-VN), request ISO; tiêu đề `Doanh thu ngày 14/11/2026`.
- Lý do huỷ: không áp dụng.
- Ai sửa, file đã sửa, file errors: subagent `tdd` 2026-11-16; `POS_UI/src/features/reports/DailyReportScreen.tsx`, `POS_UI/src/styles/components.css`, `POS_UI/test/reports-screen.test.mjs`, `POS_UI/test/reports-accessibility.browser.mjs`; `.devloopflow/errors/20261116-reports-native-date-locale.md`. User duyệt cập nhật test cũ đang giả định input ISO; giữ query API ISO. Agent chính chạy UI 230/230, browser 34/34, typecheck/build exit 0, API 256/256. Trạng thái vẫn `mở`, chờ verifier kiểm lại trên bản mã cuối.

### V1-2 — Cấp spec router / B-66: dialog Danh mục còn mở sau Back

- Phát hiện ở lần: 1; report `.devloopflow/verify/20261116-sprint10-qa/report-1.md`.
- Loại: Sai; tái hiện finding Low đã có trong `.devloopflow/review/backlog.md:582–592`. Không tạo finding bảo mật hoặc dữ liệu mới từ biểu hiện này.
- Kỳ vọng theo plan/spec (nguyên văn): “F5, nút Quay lại/Tiến của trình duyệt và mở link đều về đúng màn” (`.devloopflow/specs/20261115-sprint10-stock-ledger.md:30`). Mục L4 áp dụng “Tab chính và mọi tab con”. B-66 đề xuất “đóng state dialog thuộc tab cũ khi activeMainTab đổi, tránh chỉ ẩn rồi mở lại khi quay về”.
- Tài liệu nguồn (nguyên văn, path:dòng): `.devloopflow/specs/20261115-sprint10-stock-ledger.md:30` như trên; `.devloopflow/review/backlog.md:582–592` nêu dialog “Thêm danh mục mới” giữ sau đổi categories→sizes.
- Thực tế: trên app/UI/API sandbox thật với source hiện hành, Back đưa pathname về `/thuc-don/kich-co`, tab Kích cỡ active, nhưng một dialog “Thêm danh mục mới” vẫn phủ bảng size. Assertion nguyên văn: `B-66 dialog danh mục phải đóng khi Back về Kích cỡ`, `1 !== 0`.
- Bước tái hiện: ownerA mở `/thuc-don/kich-co`; click “Danh mục món”; bấm “Thêm danh mục”; chưa nhập/lưu; bấm browser Back về Kích cỡ. Không submit dialog, không tạo dữ liệu kinh doanh.
- Path bằng chứng: `evidence/r1-final-B66-dialog-before-back.png`, `evidence/r1-final-B66-dialog-after-back.png`, `evidence/r1-final-B66.json`, `evidence/r1-final-browser-results.json`, `evidence/scripts/r1-browser-final-run.cjs`. Ảnh sauBack đã mở xem.
- Test tái hiện đề xuất: `[B-66] Products Back closes previous tab dialog` | input: mở dialogDanhmục ở categories, browserBack sang sizes, Forward về categories | kết quả mong đợi: dialog đóng sau đổi tab và không tự mở lại; giữ action đúng entity/tab.
- Trạng thái: đã PASS (lần 2).
- Lịch sử trạng thái: 2026-11-16 — lần1 — FAIL — `evidence/r1-final-B66.json` và ảnhsauBack; không sửa hoặc chạy lại finding sau lần này.
- Lịch sử trạng thái: 2026-11-16 — fix-verify — bản sửa V1-2/B-66 đã qua test/browser/build của agent chính, chưa có `verify-ac` mới; giữ `mở`.
- Lịch sử trạng thái: 2026-11-16 — lần 2 — PASS — `evidence/r2-B-B66.json`, `evidence/r2-B-B66-dialog-after-back.png`, `evidence/r2-V-en-US-browser-results.json`, `evidence/r2-V-vi-VN-browser-results.json`, `evidence/r2-V-vi-VN-V1-2-after-back.png`. Sau Back: pathname `/thuc-don/kich-co`, tab "Kích cỡ món (1)" active, 0 `[role=dialog]`; sau Forward: `/thuc-don/danh-muc`, 0 dialog (không tự mở lại); mở lại bằng nút "Thêm danh mục" vẫn ra 1 dialog.
- Lịch sử trạng thái: 2026-11-16 — lần 3 — PASS (hồi quy) — `evidence/r3-B-B66.json`, `evidence/r3-V-en-US-browser-results.json`, `evidence/r3-V-vi-VN-browser-results.json`. Back về `/thuc-don/kich-co` 0 dialog; Forward `/thuc-don/danh-muc` 0 dialog.
- Lịch sử trạng thái: 2026-11-16 — lần 3 — PASS (hồi quy) — `evidence/r3-B-B66.json`, `evidence/r3-V-en-US-browser-results.json`, `evidence/r3-V-vi-VN-browser-results.json`. Back về `/thuc-don/kich-co` 0 dialog; Forward `/thuc-don/danh-muc` 0 dialog.
- Lý do huỷ: không áp dụng; chưa có changelog user duyệt bỏ mục tiêu router.
- Ai sửa, file đã sửa, file errors: subagent `tdd` 2026-11-16; `POS_UI/src/features/products/ProductsScreen.tsx`, `POS_UI/test/products-tabs.test.mjs`, `POS_UI/test/stock-ledger-router.browser.mjs`; `.devloopflow/errors/20261116-products-dialog-persists-after-tab-change.md`. Chín test dialog đỏ trước sửa, xanh sau; browser Back/Forward xanh. Agent chính chạy UI 230/230, browser 34/34, typecheck/build exit 0, API 256/256. Trạng thái vẫn `mở`, chờ verifier kiểm lại trên bản mã cuối.

## Các giới hạn không được hiểu là PASS mới

- PlaywrightMCP bị khóa profile; browser chứng cứ dùng Chrome/puppeteer đã cài, không đóng browser người khác.
- B-67 chưa tái hiện trong lượt browser regression9/9; chưa có bằng chứng đã sửa helper nên giữ backlog hiện có, verifier không sửa trạng thái.
- Không có CI trên working tree chưa commit; không kiểm production, SePay Live hoặc thiết bị cảm ứng thật. Không đổi credential hoặc fixture local; sandbox QA đã dọn, `remaining:0`.
- Các lỗi setup/selector/SQL QA giữ nguyên trong artifact đầu/completion, tách khỏi hai FAIL sản phẩm trên. Không xóa lịch sử và không dùng exit0 helper để bỏ assertionFAIL.
