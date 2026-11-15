# Kiểm AC report 20261114-sprint10-reports — lần 2 (chạy lại V1-1, V1-2, V1-3)

> Do `ac-verifier` tạo nội dung; agent chính chép vào file vì subagent không ghi được (Write bị chặn).

**Kết luận:** FAIL. Ngày 2026-11-14. Bằng chứng local do agent chạy, không có CI độc lập.
- Plan: `.devloopflow/approved/20261114-sprint10-reports.md`.
- Spec: `.devloopflow/specs/20261114-sprint10-reports.md`.
- AC chạy lại: ST-3.AC-5, ST-2.AC-6, E2E-AC-4, tham chiếu `docs/api-spec.md:491`.
- AC không chạy lại (giữ kết quả `report-1.md`): ST-1.AC-1, ST-1.AC-2, ST-2.AC-1..5, ST-2.AC-7, ST-3.AC-1..4, ST-3.AC-6, E2E-AC-1, E2E-AC-2, E2E-AC-3, E2E-AC-5, E2E-AC-6. Không chạy lại `npm test`, build, coverage hay hồi quy toàn bộ. Các test `[V1-1]` do `tdd` thêm cũng chưa chạy lại trong lần này.

**Môi trường:**
- UI `http://localhost:5173`: container `pos_ui` build lại với mã đã sửa V1-1.
- API `http://localhost:3000`: `pos_api` healthy. DB `pos_local`.
- Mật khẩu QA trong `evidence/scripts/live-state.json` đã bị che nên không đăng nhập lại được user `ac-s10-*` cũ (401). Không UPDATE user cũ; thêm dữ liệu mới qua API: store `ac-s10-r2b-store` có OWNER `ac-s10-r2b-owner`, 2 chi nhánh `R2B1`, `R2B2`, CASHIER `ac-s10-r2b-cash`. Lần thử đầu dừng ở bước tạo chi nhánh (422, thiếu `code`) và để lại store `ac-s10-r2-store` cùng OWNER `ac-s10-r2-owner` không dùng được. Mật khẩu các user này nằm ở scratchpad, không ghi vào evidence hay report.
- Response lỗi được trình duyệt giả bằng interception; request vẫn đi qua HTTP client thật tới API thật. Giới hạn: API không tự sinh được body thiếu `message`.
- Không đóng ca nào, không xóa gì.

## Bảng đối chiếu
| AC | Tài liệu (nguyên văn, path:dòng) | Kết quả thật | Kết luận |
|---|---|---|---|
| ST-3.AC-5, màn báo cáo | `.devloopflow/errors/20261113-invoice-load-error-details-lost.md`: "Khi xử lý lỗi đọc API, giữ message và requestId khi có, có fallback và không hiển thị response cũ qua phiên hoặc lựa chọn mới." Plan: fallback `Không tải được báo cáo. Vui lòng thử lại.` | Case A (thiếu `message`, requestId `req-reports-2`): "Không tải được báo cáo. Vui lòng thử lại. (Mã yêu cầu: req-reports-2) Thử lại". Case B (có `message` "Máy chủ chưa tải được báo cáo.", requestId `req-reports-1`): giữ nguyên message và mã. Case C (thiếu cả hai): "Không tải được báo cáo. Vui lòng thử lại. Thử lại". Chuỗi chung `Có lỗi xảy ra...` của lần 1 không còn. Bằng chứng: `evidence/r2-V1-1-ui-live.json`, `.out` | Đúng |
| ST-3.AC-5, danh sách ca (CASHIER) | Như trên | Case D (thiếu `message`, `req-shifts-2`): "Không tải được danh sách ca. (Mã yêu cầu: req-shifts-2) Tải lại ca". Case E (có `message` "Máy chủ chưa tải được ca.", `req-shifts-1`): giữ nguyên. Case F (thiếu cả hai): "Không tải được danh sách ca. Tải lại ca". Bằng chứng: `evidence/r2-V1-1-ui-shifts.json` | Đúng |
| ST-2.AC-6 | `docs/BUSINESS_RULES.md:202`: "\| BR-66 \| Lợi nhuận gộp, món bán chạy, giờ cao điểm, báo cáo tuần và tháng. \| GĐ2 \|"; `docs/PRODUCT_OVERVIEW.md:75`: "- Báo cáo tuần và tháng, món bán chạy, giờ cao điểm, lợi nhuận gộp." Plan làm món bán chạy ở Sprint 10. | Tài liệu không đổi (`git diff --stat -- docs` rỗng). Hành vi lần 1 vẫn đúng plan, không chạy lại HTTP. | Lệch tài liệu |
| E2E-AC-4 | Như trên | Như trên | Lệch tài liệu |
| V1-3, `docs/api-spec.md:491` | Dòng 491 vẫn là `/reports` và `.devloopflow/specs/legacy-reports.md` (file không tồn tại). Plan (`approved/...:332`) hẹn đổi thành `/reports/revenue` và trỏ spec mới qua sync-docs. | sync-docs chưa chạy. | Lệch tài liệu |

**Đối chiếu spec:** ràng buộc "giữ message và requestId, fallback khi thiếu" Đúng. Món bán chạy so với BR-66 Lệch tài liệu. Các mục spec khác không chạy lại.

**FAIL còn lại:** V1-2 và V1-3, loại Lệch tài liệu, trạng thái `mở`, không chọn bên nào. V1-1 đã PASS (lần 2).

**Đề xuất:** user quyết V1-2 (xác nhận món bán chạy thuộc Sprint 10 rồi sửa BR-66 và `PRODUCT_OVERVIEW.md:75`); chạy sync-docs cho V1-3. Xong hai việc đó thì task mới đóng được.

## Bằng chứng
`evidence/r2-V1-1-ui-live.json`, `evidence/r2-V1-1-ui-live.out`, `evidence/r2-V1-1-ui-shifts.json`, `evidence/ui/r2-*.png`; script trong `evidence/scripts/`: `r2-ui-live.mjs`, `r2-ui-shifts.mjs`, `r2-setup.mjs`, `r2-setup2.mjs`, `r2-probe.mjs`, `r2-dbg.mjs`.
