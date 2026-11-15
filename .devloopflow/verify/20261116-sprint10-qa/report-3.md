# Kiểm AC cấp Sprint 10 — vòng 3

## Kết luận
PASS. Bảy AC (S10-01..06, S10-11), V1-1, V1-2 đều PASS; O-1 (nhãn ngày không năm) đã hết; không có FAIL mới.

- Ngày: 16/11/2026. Chế độ dùng rời, id `20261116-sprint10-qa`; nguồn AC `sprints/sprint-10/SPRINT.md:36–42`.
- Plan: `.devloopflow/approved/20261114-sprint10-reports.md`, `.devloopflow/approved/20261115-sprint10-stock-ledger.md`. Spec: `.devloopflow/specs/20261114-sprint10-reports.md`, `.devloopflow/specs/20261115-sprint10-stock-ledger.md`.
- Bản mã: `feat/sprint10-reports`, HEAD `19ef547292ecf0ef0586f9c466d34ceb7478dd46`, working tree chưa commit. SHA256 288 file trước/sau không đổi: `evidence/r3-source-comparison.json` (`changed: []`). Verifier không sửa source/test/tài liệu nguồn.
- Report do agent chính ghi lại từ kết quả subagent `ac-verifier` (Write của subagent bị từ chối). Bằng chứng thô: `evidence/r3-*`, `r3-SHA256SUMS`.

## Tài liệu nguồn
`SPRINT.md:36–42`; hai plan và hai spec trên; `docs/PRODUCT_OVERVIEW.md:214`, `DESIGN.md:635` (ngày `dd/MM/yyyy`), `docs/BUSINESS_RULES.md`, `docs/api-spec.md`, `.devloopflow/MEMORY.md`; `report-1.md`, `report-2.md`, `fails.md` (chỉ chọn hồi quy, không suy PASS).

## Môi trường
Node.js v22; PostgreSQL 17.9. Sandbox DB riêng `ac_s10_sbx_3cc6a343`, API 3100, Vite 5174; Chrome qua `puppeteer-core` 1024×768; locale en-US/vi-VN mô phỏng; không dùng Playwright MCP. Dọn: `remaining: 0` (`evidence/r3-cleanup-1794777882668.json`). App local 3000/5173/5432 không bị đụng (3000 vẫn 200).

## Kết quả test
| Lệnh | Kết quả | Chứng cứ |
|---|---|---|
| POS_API `tsc -p tsconfig.json` | exit 0 | `r3-api-build.log` |
| POS_API `node --test --test-concurrency=1 dist/**/*.test.js` | 256/256 | `r3-api-test.log` |
| POS_UI `node --experimental-strip-types --test test/*.test.mjs` | 230/230 | `r3-ui-test.log` |
| POS_UI `tsc --noEmit`; `vite build` | exit 0; exit 0 | `r3-ui-typecheck.log`, `r3-ui-build.log` |
| POS_UI `node --test test/*.browser.mjs` | 37/37 | `r3-project-browser-tests.log` |
| `npm audit --audit-level=high` (UI, API) | exit 0; API còn 3 moderate | `r3-ui-audit.log`, `r3-api-audit.log` |
| `r3-http.cjs` | PASS | `r3-before-after.json` |
| `r3-sandbox-check.mjs` | 21/21, 0 fail | `r3-sandbox-http-results.json` |
| Browser sandbox nhóm A / B; `r3-v.cjs` mỗi locale | 4/4; 6/6; 2/2; browser-errors rỗng | `r3-A-*`, `r3-B-*`, `r3-V-*` |

Không có lệnh coverage trong dự án; không chạy.

## Bảng đối chiếu
| AC | Kết quả thật | Quy định | Kết luận |
|---|---|---|---|
| S10-01 | Hai mốc sát nửa đêm UTC+7 gom đúng ngày; hủy sau thanh toán 85000 → 50000, payment còn trong DB; OPEN/CANCELLED không tính | `SPRINT.md:36` | Đúng |
| S10-02 | total = cash + transfer; 9007199254740991 chính xác; +1 trả 500 `INTERNAL_ERROR` | `SPRINT.md:37` | Đúng |
| S10-03 | Ma trận HTTP theo vai trò, store/chi nhánh/ca khác; admin bị chặn; không đăng nhập 401 | `SPRINT.md:38`; BR-65, BR-77 | Đúng |
| S10-04 | 7 cột `1.000đ, 0đ, 3.000đ…7.000đ`; top 10 có 10 dòng; khớp SQL (`r3-A-sql.json`) | `SPRINT.md:39` | Đúng |
| S10-05 | API thật 1024×768, VND, không cuộn ngang, control ≥ 48px; tải/rỗng/lỗi 500/Thử lại | `SPRINT.md:40`; `PRODUCT_OVERVIEW.md:214`; `DESIGN.md:635` | Đúng |
| S10-06 | Request cũ không ghi đè; F5 giữ `/bao-cao`; đổi phiên không lộ dữ liệu; admin → `/cua-hang`, không request report | `SPRINT.md:41` | Đúng |
| S10-11 | SALE/SALE_REVERSAL khớp SQL (`r3-B-sql.json`); lọc chi nhánh, quyền, phân trang, rỗng, lỗi mạng/500 | `SPRINT.md:42`; BR-44, BR-72 | Đúng |
| V1-1 | Ba ô `14/11/2026`, `01/11/2026`, `07/11/2026` ở en-US và vi-VN; query ISO; `31/02/2026` báo lỗi | `PRODUCT_OVERVIEW.md:214`; `DESIGN.md:635` | Đúng |
| V1-2 | Back về `/thuc-don/kich-co` 0 dialog; Forward về `/thuc-don/danh-muc` 0 dialog; nút mở lại ra 1 dialog | spec stock-ledger `:30` | Đúng |

O-1 (`r3-A-browser-results.json`, khóa `o1`): tiêu đề `Doanh thu ngày 14/11/2026`; 7 nhãn `01/11/2026`..`07/11/2026`; mỗi `<time>` cao 16px, 1 dòng; cột rộng 106,6px (≥ 72); `.report-chart` scrollWidth 770 = clientWidth 770. Đã mở xem `r3-A-report-tablet-summary.png`, `r3-A-report-chart.png`: không tràn, không xuống dòng, không chồng.

## Đối chiếu spec
Mục tiêu ngày/range/tiền/top10/phạm vi, router, sổ kho: đúng. Không làm thừa (PB-14, SePay Live ngoài phạm vi); không dùng mock làm nguồn dữ liệu (browser sandbox trên API thật, khớp SQL); không đụng app/DB local.

## FAIL / Lệch tài liệu
Không có. V1-1, V1-2 giữ `đã PASS` (lịch sử lần 3 trong `fails.md`).

## Đánh giá test
Assert O-1 do verifier thêm trong script r3, không đổi test dự án. Browser test dự án dùng `window.fetch` giả; phần API thật được bù bằng sandbox. `reports-screen.test.mjs:253` kiểm nhãn `dd/MM/yyyy`.

## Đề xuất
Không cần sửa. O-2: 3 moderate (typeorm → minimatch) ở POS_API, không có high.

## Không kiểm / giới hạn
Không có CI cho working tree chưa commit; không kiểm thiết bị cảm ứng thật, Safari/Firefox, SePay Live, production. Locale chỉ mô phỏng trên Chrome. B-67 không kiểm lại.
