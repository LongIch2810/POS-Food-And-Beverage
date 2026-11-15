# Sổ FAIL của task 20261114-sprint10-reports
<!-- Do ac-verifier tạo và cập nhật sau MỖI lần chạy verify-ac, nằm ở .devloopflow/verify/<id>/fails.md. Mục đích: lưu mọi FAIL để làm việc sau (user hoặc agent chính đọc lại khi tiếp tục task). Chỉ thêm, không xoá mục cũ. File này được commit nên chỉ ghi tóm tắt và trích đoạn ngắn không nhạy cảm, TUYỆT ĐỐI không ghi secret/token/PII; bằng chứng thô nằm ở evidence/ (bị .gitignore chặn). -->

- Task: 20261114-sprint10-reports
- Cập nhật lần cuối: 2026-11-14 (sau lần verify-ac thứ 5, chạy lại toàn bộ AC sau đổi token viền, B-59 và gom reportScope; không FAIL mới; trước đó lần 4, 3, 2 và 1)
- Điều kiện đóng task: không còn mục trạng thái `mở` (mục `huỷ do đổi plan/spec` không tính) và kết quả mới nhất của mọi AC còn trong plan đã duyệt là PASS.

## Tổng hợp
| Id | AC | Loại | Trạng thái | Phát hiện ở lần | PASS ở lần | Report | Bằng chứng |
|---|---|---|---|---|---|---|---|
| V1-1 | ST-3.AC-5 | Sai | đã PASS | 1 | 2 | report-1.md | evidence/ui-live-2.json (bước 11), evidence/scripts/ui-live-2.mjs |
| V1-2 | ST-2.AC-6, E2E-AC-4 | Lệch tài liệu | đã PASS | 1 | 3 | report-1.md | evidence/bestseller-http.json, evidence/bestseller-db.json, evidence/r3-V1-2-V1-3-docs-check.txt |
| V1-3 | Cấp spec (tham chiếu `docs/api-spec.md:491`) | Lệch tài liệu | đã PASS | 1 | 3 | report-1.md | docs/api-spec.md:491, evidence/r3-V1-2-V1-3-docs-check.txt |

- Loại: Sai | Spec | Lệch tài liệu | Không có chứng cứ | Môi trường | errors/ thiếu
- Trạng thái: `mở` (chưa sửa, hoặc đã sửa nhưng chưa chạy lại) | `đã PASS` (lần chạy lại cho thấy PASS, có bằng chứng) | `huỷ do đổi plan/spec` (AC hoặc mục spec của FAIL này đã bị bỏ trong bản plan/spec user duyệt lại, có dòng Changelog ghi sự duyệt đó; chỉ `ac-verifier` đặt)

## Chi tiết từng FAIL

### V1-1 — ST-3.AC-5
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261114-sprint10-reports/report-1.md`)
- Kỳ vọng theo plan (nguyên văn): "hiển thị loading, giữ message/requestId khi có, fallback `Không tải được báo cáo. Vui lòng thử lại.` khi thiếu" (ST-3.AC-5 trong plan đã duyệt).
- Tài liệu nguồn (nguyên văn, path:dòng): `.devloopflow/errors/20261113-invoice-load-error-details-lost.md`: "Khi xử lý lỗi đọc API, giữ message và requestId khi có, có fallback và không hiển thị response cũ qua phiên hoặc lựa chọn mới."
- Thực tế: UI hiện `Có lỗi xảy ra. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)` khi body lỗi thiếu `message`. Chuỗi do `POS_UI/src/http/client.ts:45` gán (`json.error?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.'`), nên fallback ở `POS_UI/src/features/reports/DailyReportScreen.tsx:164` không bao giờ chạy trên luồng thật. Danh sách ca thiếu message cũng hiện chuỗi chung này. Test dự án xanh vì `POS_UI/test/reports-screen.test.mjs:260` giả `reportService`.
- Bước tái hiện: bước 11 trong `evidence/ui-live-2.json` hoặc `evidence/scripts/ui-live-2.mjs`.
- Test tái hiện đề xuất: `test_ST3_AC5_fallback_through_real_client` | input: render `DailyReportScreen` với HTTP client thật, `fetch` trả 500 `{error:{code:'INTERNAL_ERROR',requestId:'req-reports-2'}}` | kết quả mong đợi: alert chứa `Không tải được báo cáo. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)`.
- Trạng thái: đã PASS
- Lịch sử trạng thái (chỉ thêm): 2026-11-14 — lần 1 — FAIL — evidence/ui-live-2.json
  - 2026-11-14 — lần 2 — PASS — UI thật (container `pos_ui` build mới): body 500 thiếu message + có requestId hiện "Không tải được báo cáo. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)"; thiếu cả hai hiện fallback không mã; có message của server giữ nguyên kèm requestId; danh sách ca (CASHIER) tương tự ("Không tải được danh sách ca. ..."). Bằng chứng: evidence/r2-V1-1-ui-live.json, evidence/r2-V1-1-ui-shifts.json, evidence/ui/r2-*.png. Report: report-2.md
  - 2026-11-14 — lần 4 — PASS (hồi quy, chạy lại toàn bộ AC): UI thật + client thật, body 500 thiếu message + có requestId hiện "Không tải được báo cáo. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)"; có message server giữ nguyên kèm requestId; danh sách ca/chi nhánh lỗi giữ message/requestId hoặc fallback. `npm test` UI 161/161 gồm `[V1-1]` x3. Bằng chứng: evidence/r4-ui-live-2.json (bước 10-11), evidence/r4-ui-live-4.json, evidence/r4-ui-full.log. Report: report-4.md
  - 2026-11-14 — lần 5 — vẫn PASS (hồi quy): UI thật + client thật, body 500 thiếu message + có requestId hiện "Không tải được báo cáo. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)"; có message server giữ nguyên kèm requestId; danh sách chi nhánh/ca lỗi giữ message/requestId hoặc fallback. UI test 166/166 gồm `[V1-1]`. Bằng chứng: evidence/r5-ui-live-2.json (bước 10-11), evidence/r5-ui-live-4.json, evidence/r5-ui-full.log. Report: report-5.md
- Ai sửa, file đã sửa, file `.devloopflow/errors/` (agent chính hoặc user điền sau khi sửa): 2026-11-14 `tdd` (fix-verify) sửa: `POS_UI/src/http/client.ts` (export `GENERIC_ERROR_MESSAGE`), `POS_UI/src/features/reports/DailyReportScreen.tsx` (`describe`), test `POS_UI/test/reports-screen.test.mjs` (3 test `[V1-1]`); errors: `20261114-ui-shared-client-default-message-masks-screen-fallback.md`. Chờ `verify-ac` chạy lại, trạng thái vẫn `mở`.

### V1-2 — ST-2.AC-6, E2E-AC-4
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261114-sprint10-reports/report-1.md`)
- Kỳ vọng theo plan (nguyên văn): "top 10 theo số lượng và tie name/size/UUID, cùng size gộp và tên snapshot mới nhất, 30000+5000 hiển thị 35000 trước giảm giá" (E2E-AC-4); hành vi đã triển khai đúng như plan.
- Tài liệu nguồn (nguyên văn, path:dòng): `docs/BUSINESS_RULES.md:202`: "| BR-66 | Lợi nhuận gộp, món bán chạy, giờ cao điểm, báo cáo tuần và tháng. | GĐ2 |"; `docs/PRODUCT_OVERVIEW.md:75`: "- Báo cáo tuần và tháng, món bán chạy, giờ cao điểm, lợi nhuận gộp." (nhóm ngoài MVP). Ngược lại: Sprint 10 lấy món bán chạy theo quyết định Product Owner ngày 14/11 (`docs/PRODUCT_BACKLOG.md:7`, `sprints/sprint-10/SPRINT.md:10`).
- Thực tế: plan và spec làm "món bán chạy" trong Sprint 10; tài liệu quy tắc xếp nó GĐ2. Không chọn bên nào.
- Bước tái hiện: đối chiếu plan/spec với `docs/BUSINESS_RULES.md:202` và `docs/PRODUCT_OVERVIEW.md:75`.
- Test tái hiện đề xuất: Không áp dụng (lệch tài liệu); lệnh kiểm thay thế: sau khi user quyết, đọc lại `BR-66` và `PRODUCT_OVERVIEW.md:75` có khớp plan.
- Trạng thái: đã PASS
- Lịch sử trạng thái (chỉ thêm): 2026-11-14 — lần 1 — FAIL (Lệch tài liệu) — evidence/bestseller-http.json
  - 2026-11-14 — lần 3 — PASS: user xác nhận món bán chạy thuộc Sprint 10; `docs/BUSINESS_RULES.md:202` (BR-66) bỏ "món bán chạy"; `docs/PRODUCT_OVERVIEW.md:68` đưa vào MVP, mục GĐ2 bỏ; khớp plan/spec. SHA256SUMS của evidence API còn khớp, `POS_API/src/reports` không đổi sau lần 1. Bằng chứng: evidence/r3-V1-2-V1-3-docs-check.txt. Report: report-3.md
  - 2026-11-14 — lần 2 — vẫn FAIL (Lệch tài liệu): `docs/BUSINESS_RULES.md:202` (BR-66, GĐ2) và `docs/PRODUCT_OVERVIEW.md:75` chưa đổi, user chưa quyết; Changelog plan không có dòng duyệt. Giữ `mở`. Report: report-2.md
  - 2026-11-14 — lần 4 — vẫn PASS (hồi quy): BR-66 (`docs/BUSINESS_RULES.md:202`) không còn món bán chạy; `docs/PRODUCT_OVERVIEW.md:68` có món bán chạy trong MVP, mục GĐ2 không còn; hành vi API chạy lại thật: top 10, gộp cùng size đổi tên (P1 -> P1x, 12 = 6+6), tie P3-L trước P3-M, topping 35000 một lần, SQL độc lập khớp. Bằng chứng: evidence/r4-bestseller-http.json, evidence/r4-bestseller-db.json, evidence/r4-sandbox-http-results.json. Report: report-4.md
  - 2026-11-14 — lần 5 — vẫn PASS (hồi quy): `docs/BUSINESS_RULES.md:202` (BR-66) không còn món bán chạy; `docs/PRODUCT_OVERVIEW.md:68` có món bán chạy trong MVP; API live chạy lại top 10, gộp cùng size đổi tên (P1x = 6+6 = 12), tie ổn định; SQL độc lập khớp. Bằng chứng: evidence/r5-bestseller-http.json, evidence/r5-bestseller-db.json, sandbox mục C (evidence/r5-sandbox-http-results.json). Report: report-5.md
- Ai sửa, file đã sửa, file `.devloopflow/errors/`: chưa sửa.

### V1-3 — cấp spec (tham chiếu API spec)
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261114-sprint10-reports/report-1.md`)
- Kỳ vọng theo plan (nguyên văn): "docs/api-spec.md:491: dòng Báo cáo đổi `/reports` thành `/reports/revenue`, thay tham chiếu legacy-reports.md không tồn tại bằng `.devloopflow/specs/20261114-sprint10-reports.md`" (ST-3, mục "Tài liệu cần cập nhật sau triển khai qua sync-docs").
- Tài liệu nguồn (nguyên văn, path:dòng): `docs/api-spec.md:491` vẫn ghi `/reports` và trỏ `.devloopflow/specs/legacy-reports.md` (file không tồn tại).
- Thực tế: tài liệu chưa cập nhật; plan hẹn sửa ở bước 10b (sync-docs).
- Bước tái hiện: đọc `docs/api-spec.md:491`.
- Test tái hiện đề xuất: Không áp dụng (tài liệu); lệnh kiểm thay thế: `rg -n "legacy-reports|/reports" docs/api-spec.md` phải thấy `/reports/revenue` và spec mới.
- Trạng thái: đã PASS
- Lịch sử trạng thái (chỉ thêm): 2026-11-14 — lần 1 — FAIL (Lệch tài liệu, đã biết) — docs/api-spec.md:491
  - 2026-11-14 — lần 3 — PASS: `docs/api-spec.md:491` là `/reports/revenue` trỏ `.devloopflow/specs/20261114-sprint10-reports.md` (file tồn tại); `rg legacy-reports docs/api-spec.md` không kết quả; khớp plan dòng 332. Bằng chứng: evidence/r3-V1-2-V1-3-docs-check.txt. Report: report-3.md
  - 2026-11-14 — lần 2 — vẫn FAIL (Lệch tài liệu): `docs/api-spec.md:491` vẫn `/reports` và `legacy-reports.md`; sync-docs chưa chạy. Giữ `mở`. Report: report-2.md
  - 2026-11-14 — lần 4 — vẫn PASS (hồi quy): `docs/api-spec.md:491` là `/reports/revenue` trỏ `.devloopflow/specs/20261114-sprint10-reports.md`, khớp plan dòng 332. Bằng chứng: đọc trực tiếp `docs/api-spec.md:491` lúc chạy lần 4. Report: report-4.md
  - 2026-11-14 — lần 5 — vẫn PASS (hồi quy): `docs/api-spec.md:491` (đọc lại lúc chạy lần 5) là `/reports/revenue` trỏ `.devloopflow/specs/20261114-sprint10-reports.md`, khớp plan. Report: report-5.md
- Ai sửa, file đã sửa, file `.devloopflow/errors/`: chưa sửa.
