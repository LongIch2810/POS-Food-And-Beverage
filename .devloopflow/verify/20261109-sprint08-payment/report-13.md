# Kiểm AC report 20261109-sprint08-payment — vòng 13 (chạy lại chỉ các mục `mở`)

## Kết luận
FAIL (cổng task chưa đóng): V1-4 PASS (đề xuất), V11-1 PASS (đề xuất, có giới hạn), V12-1 chưa đóng (tài liệu không quy định việc miễn file errors/ cho mục backlog tài liệu/test-gap; chờ user).

- Ngày 2026-11-11. Nhãn bằng chứng: **local do agent chạy** (agent chính thu thập provider ở Phụ lục 12b của `report-12.md`; `ac-verifier` context sạch kiểm độc lập bằng mở file và chạy kiểm local sandbox). Không có CI/runner độc lập. Bằng chứng thô ở `.devloopflow/verify/20261109-sprint08-payment/evidence/` (bị `.gitignore` chặn), không đối chiếu được từ remote.
- Plan: `.devloopflow/approved/20261109-sprint08-payment.md`. Spec: `.devloopflow/specs/20261109-sprint08-payment.md`, `.devloopflow/specs/20261109-sprint08-payment-api.md`.
- Nguồn report: subagent `ac-verifier` (model sonnet) trả nội dung dạng văn bản vì công cụ Write từ chối ghi file từ subagent; **agent chính ghi file này** sau khi tự kiểm lại các điểm trong mục "Kiểm lại của agent chính" bên dưới.
- HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf` (khớp `evidence/r12-git-head.txt`), working tree dirty (Sprint 08 chưa commit).
- `git status --short` hiện tại giống hệt `evidence/r12-git-status-before.txt` (diff rỗng). Không file nào trong `POS_API/src`, `POS_UI/src` có mtime sau 2026-11-11T09:48:05Z (agent chính chạy lại `find -newermt`, rỗng). `POS_API/dist` build 2026-11-11 16:47:11 (+07), sau mọi file src, trước `npm start` 16:47:26 (`r12-provider/api-app.command.json`). Mã lúc chạy provider là mã cuối.
- `r12-git-diff-stat.txt` chỉ 176 byte, không so được với `git diff --stat` hiện tại; việc so mã cuối dựa vào `git status`, mtime và `dist`.
- Không chạy lại `npm test`/`npm run build` ở lượt này. Kết quả r12 giữ nguyên: API 150/150, UI 65/65, build/typecheck exit 0 (`evidence/r12-*.result.json`).

## Kiểm lại của agent chính (trước khi ghi file)
Agent chính tự chạy lại và đối chiếu: các file `r13-*` tồn tại trong `evidence/` (3 PNG, `r13-local-api.json`, `r13-local-db-readonly.json`, log API/Vite, `scripts/r13-local-check.cjs`, `scripts/r13-up.cjs`); `git status` = ảnh chụp trước; không file src đổi sau lượt provider; `DESIGN.md:56-57` đúng như subagent trích ("từ 1280px | Máy tính" và "1024 đến 1279px | Tablet ngang | **Màn hình POS chính.**"); các id thiếu errors/ (B-18, B-20, B-28, B-32, B-33, R4-2, R4-4: 0 file; B-13, B-15, B-16, B-25: chỉ được nhắc trong file của id khác, ví dụ `20261110-payment-test-event-id-collision.md`, `20261110-webhook-timestamp-boundary-flaky.md`, `20261110-test-order-dependency-b16-user.md`). **Agent chính chưa tự mở lại** các ảnh PNG r13 và `r13-local-db-readonly.json`; các kết luận dựa vào đó là lời của subagent.

## AC không chạy lại ở vòng 13 (kết quả mới nhất, từ `report-12.md`)
- ST-1..ST-7, E2E-AC-1..3, E2E-AC-4/5/6 (phần HMAC local), E2E-AC-7 (API/DB), R2-1, R14-1, RF-1..4: Đúng theo (a)=(b) ở vòng 12 (70/70 assertion). Điều kiện (b)=(c) vẫn "chưa xác minh vòng này" theo `report-12.md`.
- ST-8.AC-1 (QR pending, reload, fallback, đổi session), ST-8.AC-2 (bank settings UI), E2E-AC-5 vế UI, E2E-AC-7 vế UI: NOT VERIFIED ở vòng 12; vòng 13 không chạy lại.
- V1-1, V1-2, V1-3, V2-1, V2-2, V3-1, V3-2: giữ `đã PASS`.

## V1-4 — SePay Test mode thật: PASS (đề xuất chuyển `đã PASS`, kèm điều kiện)
Đã mở: `r12-provider/{ngrok-webhooks.redacted.json, audit-before, audit-after-exact, audit-after-exact-movements, audit-after-under, audit-after-over, audit-after-late, audit-after-promo, audit-after-manual, audit-final, sepay-dashboard-after.txt, environment.json, fixtures-public.json, api-app.stdout.txt, ngrok.log, http.jsonl}`, `r12-sepay-dashboard-capture.txt`, `scripts/r12p-up.cjs`, `scripts/r12p-audit.cjs`.

| Ca | provider id, ref | Tiền (nhận/đơn) | Mã (18 ký tự, khớp `^HD[A-Za-z0-9]{16}$`) | Kết quả DB | Khớp plan |
|---|---|---|---|---|---|
| EXACT | 48010, SBEA611ECA1618 | 25.000/25.000 | HD09AV4JC7IN2LS6SZ | event PAID; invoice PAID; 1 payment WEBHOOK 25.000/25.000, excess 0, `transaction_ref`=SBEA611ECA1618; 1 SALE -2, nguồn SYSTEM, actor NULL | Đạt |
| UNDER | 48011, SB83571123A8B5 | 24.000/25.000 | HDCDS2KYW3ZSB8GXUZ | UNDERPAID; OPEN; lượt vẫn PENDING; không payment/movement | Đạt |
| OVER | 48012, SB715CF3389515 | 30.000/25.000 | HDCBS5R6NQOKG1POZ2 | PAID; payment.amount 25.000, actual 30.000, excess 5.000, `transaction_ref`=SB715CF3389515; 1 SALE | Đạt |
| LATE | 48013, SBB0D31F51EA2A | 25.000/25.000 | HD80RCME5VSPMRDFG6 (lượt A đã hủy) | ATTEMPT_CANCELLED; OPEN; lượt B HD80RCME5VMSZ2K1AD vẫn PENDING; không payment/movement | Đạt |
| PROMO | 48014, SBB79598017798 | 15.000/15.000 | HDHJEIRVT9GL87MC95 | PROMOTION_INVALID; OPEN; `used_count` 0; không payment/movement | Đạt |

Đối chiếu chéo:
- **(a)** 5 `provider_event_id` 48010..48014 trong DB = `payload.id` trong ngrok = dòng giao dịch trên dashboard. Số tiền, `accountNumber`, `code` khớp từng ca. `referenceCode` (SB...) = `provider_reference` DB = cột "ref" dashboard.
- **(b)** Từng ca đúng bảng trên.
- **(c)** Payment và movement chỉ phát sinh ở 2 ca PAID do webhook và 2 xác nhận thủ công (cố ý, thuộc V11-1). Truy vấn chỉ đọc mới `r13-local-db-readonly.json`: payments 4, movements 4, events 5; `used_count` promo 0. `audit-before.json` có lỗi truy vấn movements (`column m.reference_id does not exist`) nên không có số movement chụp trước; `audit-after-exact-movements.json` chỉ có 1 dòng (EXACT); bảng append-only nên trước đó là 0 (suy luận).
- **(d)** Test mode: request ngrok có `User-Agent: SePay-Testmode-Webhook/1.0` (độc lập với phần thuật của agent chính). Dashboard `/testmode/transaction`, `#testmodeToggle` bật và banner "dữ liệu không ảnh hưởng tài khoản thật" ở `r12-sepay-dashboard-capture.txt` (chụp trước lượt chạy). Tài khoản `TPBank - 0003` số `0000000003`; POS đặt số này bằng `PATCH /store-bank-account` 200 (`http.jsonl` dòng 5, `r12p-up.cjs:59`); ảnh QR hiện "Số tài khoản: 0000000003". Id 48010+ nối tiếp 47557 của lần test-mode trước.
- **(e)** 5 mã `SB...` khác nhau; `transaction_ref` của 2 payment WEBHOOK lấy đúng từ `referenceCode`.
- **(f)** Thời gian: `X-Sepay-Timestamp` 09:50:52Z đến 09:53:06Z; dashboard 16:50:52 đến 16:53:05 (+07); lịch sử gửi #69557..#69561 lúc 16:50:53 đến 16:53:06; log API/ngrok 16:50:55 đến 16:53:08; `received_at` DB 09:50:53.234, 09:51:48.696, 09:52:22.456, 09:52:47.908, 09:53:08.505 (Z). Log host (API/ngrok) chạy trước SePay khoảng 2 giây ở cả 5 lượt; nguyên nhân lệch **chưa xác minh**; không ảnh hưởng hành vi vì mọi webhook nằm trong cửa sổ 300 giây.
- **Chữ ký:** `api-app.stdout.txt` có đúng 5 dòng `POST /api/v1/payments/sepay/webhook 200`, không 401/400, cùng giờ với ngrok. Webhook không ký đúng bị API từ chối (đã kiểm r12), nên 200 cho thấy HMAC khớp secret trong `POS_API/.env`.

Đối chiếu plan `.devloopflow/approved/20261109-sprint08-payment.md:286` (plan active giống approved, `diff -q` rỗng):

| Bước | Kết quả |
|---|---|
| (1) OWNER PATCH account POS | Đạt (`http.jsonl` dòng 5) |
| (2) đăng ký chính account đó ở Test mode | Đạt (TPBank-0003; bản chép văn bản) |
| (3) webhook HMAC, tiền tố `HD`, hậu tố 16 | Đạt (URL ngrok, "HMAC-SHA256", màn mô phỏng "HD[A-Za-z0-9]{16}") |
| (3) "chưa bật lọc chỉ gửi khi có mã" | Capture không ghi dòng riêng; chưa xác minh trực tiếp, nhưng cả 5 giao dịch đều nhận webhook |
| (4) `code` tách đúng 18 ký tự | Đạt |
| (5) mô phỏng đúng account/reference/amount | Đạt |
| (6) dashboard, request, response, DB trước/sau | Đạt (dashboard dạng văn bản) |
| (6) GET invoice | Chỉ có log truy cập API: GET `/invoices/af118060-...` 304 rồi 200 lúc 16:50:56, ngay sau webhook 16:50:55; chưa có curl có xác thực lúc chạy provider; đã chạy bù local ở r13 (dưới) |
| (7) underpay/overpay/late/promo | Đạt |

Giới hạn (không làm đổi kết luận hành vi):
1. Dashboard là bản chép văn bản của agent chính từ chrome-mcp, không có ảnh hay output thô của công cụ; ac-verifier không mở dashboard (không đụng tab của user). `AGENTS.md:93-94` yêu cầu output gốc. `ngrok-webhooks.redacted.json` cũng là bản đã che do agent tạo, nhưng khớp log API, `ngrok.log` và DB.
2. Replay cùng event id từ provider chưa chạy (RF-1 có ở harness local r12).
3. PROMO hết hạn bằng SQL `UPDATE promotion_codes SET end_at=now()-interval '1 hour'` (`r12p-up.cjs:71`), không bằng đồng hồ thật.
4. Webhook muộn sau xác nhận thủ công (vế cuối E2E-AC-6) chưa chạy qua provider (có ở harness local).

Kiểm bù local r13 (sandbox, không ngrok/SePay): `r13-local-api.json`: manager đăng nhập, `GET /bank-transfer-exceptions?limit=100` 200 `total: 3` (PROMOTION_INVALID 15.000, ATTEMPT_CANCELLED 25.000, UNDERPAID 24.000); `GET /invoices/{id}` 200 cho 6 hóa đơn: EXACT/OVER/LATE/UIMANUAL `PAID`, UNDER/PROMO `OPEN`. Quan sát: GET hóa đơn PROMO trả total 25.000 trong khi DB `total_amount` 15.000 và discount 10.000 (theo subagent "đã ghi ở R10, không mới"; agent chính chưa đối chiếu lại R10).

## V11-1 — S8-07 chuyển trạng thái UI: PASS (hai chuyển trạng thái), có phần chưa phủ
Đã mở 4 PNG, `ui-network-manual-confirm.redacted.txt`, `manual-confirmer.txt`, `audit-*.json`, `api-app.stdout.txt`.

- **Auto-PAID**: `ui/r12p-ui-exact-before_...49-51-605Z.png` (hộp thoại "Thanh toán · HD09AV4JC7", "Đang chờ chuyển khoản", QR VietQR TPBank, "Số tài khoản: 0000000003", "Số tiền: 25.000đ · Nội dung: HD09AV4JC7IN2LS6SZ", 6 đơn mở) → `ui/r12p-ui-exact-after_...51-03-464Z.png` ("Thanh toán thành công.", HD09AV4JC7 rời danh sách, còn 5 đơn). Log API: webhook 200 lúc 16:50:55, GET invoice 304 rồi 200 lúc 16:50:56, rồi GET `/invoices`. DB: PAID, 1 payment WEBHOOK, 1 SALE. Đạt. (Agent chính đã tự mở và đọc hai ảnh này ở Phụ lục 12b.)
- **Manager thấy ngoại lệ**: ảnh `manager-before-manual` thấy nút "Xác nhận thủ công" và QR của HDNAWHODYY nhưng khối "Giao dịch cần đối soát" bị cắt, **ảnh không chứng minh được 3 ngoại lệ**. Chạy bù r13 (local, 1024x768, manager, đơn HDCDS2KYW3): text DOM của hộp thoại liệt kê đúng 3 mục: "Mã giảm giá không còn hiệu lực · 15.000đ", "Chuyển sau khi hủy chờ · 25.000đ", "Chuyển thiếu tiền · 24.000đ". `r13-ui-1024-manager-exceptions.png` hiện nút "Xác nhận thủ công" và 2 mục đầu; mục thứ 3 nằm dưới vùng cuộn, chỉ có trong text DOM. Khớp nhãn trong `POS_UI/src/features/pos/LivePaymentDialog.tsx:120` và API `total: 3`.
- **Xác nhận thủ công**: log API: `POST /transfer-attempts/5192624c-.../confirm-manual 201` lúc 16:55:28 (UIMANUAL) và `.../04a0185b-.../confirm-manual 201` lúc 16:56:53; cái sau có requestId `b9e69c40-...` trùng `ui-network-manual-confirm.redacted.txt`, kèm `Idempotency-Key`, 201 Created. DB (`r13-local-db-readonly.json`): 2 payment MANUAL, `confirmed_by` = qa12p_manager, `created_by = confirmed_by`, lý do được lưu; 2 SALE nguồn USER actor qa12p_manager; `invoice_in_original_shift` = true cho cả 4 hóa đơn (chỉ có 1 ca). Dialog hiện đúng lượt B của đơn LATE. Ảnh `manager-after-manual` chỉ thấy "Thanh toán thành công." bị cắt ở mép dưới, không thấy danh sách: không dùng làm bằng chứng đơn rời danh sách; việc đó dựa vào `ui-network-manual-confirm.redacted.txt` ("HD80RCME5V rời danh sách") và `GET /invoices?status=OPEN` sau 201.
- **Tablet ngang**: ảnh r12 có viewport thực đo 1407x731, thuộc băng "Máy tính" theo `DESIGN.md:56-57`, không phải "Tablet ngang | Màn hình POS chính". Bù r13 (Playwright, 1024x768, `scrollWidth` 1024): QR PENDING `r13-ui-1024-qr-pending-before-reload.png`; sau reload mở lại đơn `r13-ui-1024-qr-pending-after-reload.png` có cùng "HDCDS2KYW3ZSB8GXUZ", đủ ngân hàng/số tài khoản/số tiền, không cuộn ngang.
- **Chưa phủ**: network phía browser của ca auto-PAID và của lần xác nhận thủ công thứ nhất (chỉ có log server); ảnh QR lỗi fallback, hủy chờ rồi tạo lượt B, bank settings 19/20 chữ số, đổi session trên UI cuối (không chạy lại ở vòng 13; r11 có chứng cứ, src không đổi sau 2026-11-10 23:57 (+07), thư mục run r11 mang thời điểm 2026-11-11 00:22:26 theo tên, chưa kiểm băm).
- Quan sát (tài liệu không quy định): danh sách "Đơn đang mở" của thu ngân không tự làm mới khi đơn khác được trả bằng webhook. Quan sát (chưa đối chiếu tài liệu): danh sách ngoại lệ hiện UUID hóa đơn thô ("Đơn da4ba552-...").
- Điều kiện chuyển `đã PASS`: chấp nhận bằng chứng log server và DB cho network của hai ca nói trên, hoặc chạy lại với network capture có method/path/status. Cần `run.md` theo `AGENTS.md` cho lượt r12b/r13.

## V12-1 — errors/: chưa đóng (Tài liệu không quy định)
Bốn file agent chính ghi ngày 2026-11-11: `20261110-webhook-timestamp-boundary-flaky.md`, `20261110-cancel-qr-forbidden-cases-missing.md`, `20261110-test-order-dependency-b16-user.md`, và mục "Cập nhật (B-24)" trong `20261110-payment-test-event-id-collision.md`.
- Có đủ frontmatter (id, tags, found_by, severity, occurrences, tasks) và các mục Triệu chứng, Nguyên nhân gốc, Cách fix, Quy tắc phòng tránh, Dấu hiệu nhận biết. Nội dung có nguồn: khớp `review/backlog.md` và task; test trong source khớp `payment.integration.test.ts:204,212,254-257,1490-1492`; số "149/149" có trong task dòng 249; INDEX có 4 dòng tương ứng. Subagent không phát hiện chỗ bịa. Số dòng trong file errors là dòng lúc review, lệch dòng hiện tại (ví dụ 1433 so với 1490).

| Id | Trạng thái |
|---|---|
| B-1..B-12 (trừ B-8/B-9 xem file riêng) | có file riêng (`20261110-backlog-*` và các file trong INDEX) |
| B-8, B-9 | có file riêng (`api-spec-webhook-check-order-stale`, `spec-apply-promotion-missing-shift-not-open`) |
| B-17, B-19, B-21, B-29, B-30, B-31, B-34, B-35, B-36 | có file riêng |
| B-22, B-23, B-24, B-26, B-27 | có file mới (bốn file trên) |
| B-14 | được `cancel-qr-forbidden-cases-missing` nhắc trong Triệu chứng, không có id riêng. Tài liệu không quy định |
| B-13, B-15, B-16 (thiếu test, đã sửa bằng thêm test) | chỉ bị nhắc bên trong file của id khác, không có bản ghi riêng. Tài liệu không quy định |
| B-25, B-32, B-33 (sửa tài liệu) | không file; lý do miễn do agent chính ghi theo tiền lệ B-28 (dòng cuối `review/backlog.md`). Tài liệu không quy định |
| B-18, B-20 (sửa tài liệu/spec) | không file và không có lý do miễn nào được ghi. Tài liệu không quy định, thiếu ghi lý do |
| B-28 | không file; task dòng 243 ghi "không tạo errors/ vì là tài liệu". Tài liệu không quy định |
| R3-2, R6-2, R13-1 | sửa bằng chính việc ghi file errors/, file tồn tại |
| R4-2, R4-4 | không file riêng. Tài liệu không quy định |
| V1-2, V1-3, V2-1 (lệch tài liệu, sửa bằng sync-docs/sửa chữ) | không file. Tài liệu không quy định |
| V11-1, V12-1 | đang mở, không áp dụng |

Trích `ac-verifier.md` bước 10: "mỗi finding phải có file `.devloopflow/errors/` đủ mục (hoặc lý do hợp lệ không ghi trong task). Thiếu thì báo FAIL kèm danh sách finding thiếu file." Tài liệu không nói lý do nào là hợp lệ.

Danh sách thiếu để user quyết: B-13, B-15, B-16, B-18, B-20, B-25, B-28, B-32, B-33; thêm R4-2, R4-4, V1-2, V1-3, V2-1 nếu tính cả mục ngoài backlog.

## Bằng chứng mới của vòng này
- `evidence/r13-local-api.json`, `r13-local-db-readonly.json`, `r13-api.command.json`, `r13-api.stdout.txt`, `r13-api.stderr.txt`
- `r13-ui-1024-qr-pending-before-reload.png`, `r13-ui-1024-qr-pending-after-reload.png`, `r13-ui-1024-manager-exceptions.png`
- `r13-ui-api.stdout.txt`, `r13-ui-vite.stdout.txt`, `r13-up.pids.json`, `r13-STOP`, `r13-STOPPED`
- `scripts/r13-local-check.cjs`, `scripts/r13-up.cjs`

Các lượt đăng nhập r13 ghi hàng session vào DB sandbox, không phải truy vấn thuần chỉ đọc. DB `pos_s8_qa_r12p_mwbxplfx` giữ nguyên. Container `pos_s8_r12_pg` đã dừng.

## Lệch tài liệu
Không có lệch mới. Tài liệu không quy định: (1) miễn file errors/ cho finding tài liệu hoặc test-gap; (2) quyền `invoice.cancel_open` cho MANAGER (từ r12, chưa quyết).

## Đề xuất
1. V1-4: chuyển `đã PASS` nếu chấp nhận 4 giới hạn. Nếu không, chụp ảnh dashboard kèm output thô và chạy replay cùng id ở lượt provider sau.
2. V11-1: chuyển `đã PASS` cho hai chuyển trạng thái. Các vế ST-8 còn lại dùng chứng cứ r11, chạy lại nếu cần trên UI cuối.
3. V12-1: user quyết miễn hay yêu cầu file cho danh sách thiếu.
4. Tạo `qa-evidence/<ts>-48ed476-s8-verify-ac-r13/run.md` (chỉ Markdown đã che) theo `AGENTS.md`.
5. Tiến trình đã dọn: API cổng 13071 và 13061, Vite 15195 đã dừng (`r13-STOPPED` 2026-11-11T10:06:30Z); trình duyệt Playwright đã đóng; container `pos_s8_r12_pg` đã `docker stop`; không xóa DB hay container. `.playwright-mcp/` ở gốc repo bị git bỏ qua.

## Phụ lục 13b — browser QA E2E-AC-8 (11/11/2026, local do agent chạy, KHÔNG độc lập)
- Môi trường: sandbox PG `pos_s8_r12_pg` (DB `pos_s8_qa_r14_*`), API :13081, UI :15215, Playwright viewport 1180×820, không ngrok/SePay. Artifact gốc chỉ có ở local: `evidence/r14-qa/` (fixtures-public.json, audit-*.json, act.jsonl, ui/*.png).
- S1 thanh toán trên UI: đóng dialog, "Thanh toán thành công.", panel bỏ chọn, thực đơn khóa; tạo đơn mới HD1X2OYRPD thêm món được; DB: HDTX9F5P52 PAID, 1 món không đổi. Đạt.
- S2 hủy đơn HDBD4YXPDK: bỏ chọn ngay, "Đã hủy đơn.", biến khỏi danh sách; DB CANCELLED. Đạt.
- S3 sơ đồ bàn cũ (HDGW01K1ZA đã PAID bên ngoài): chạm Bàn 1 tạo đơn mới HD1SQHZAHY, không mở đơn cũ. Đạt.
- S4 danh sách "Đơn đang mở" cũ (HDIBD091BJ đã PAID bên ngoài): bấm → không chọn, danh sách làm mới (còn HD1SQHZAHY, HD1X2OYRPD), thông báo "Đơn đã thanh toán hoặc đã đóng. Danh sách đã được làm mới." xuất hiện (kiểm bằng evaluate; ảnh `ui/s4-stale-click-after.png`); DB audit-after-s4-ui: HDIBD091BJ PAID, 3 payments. Đạt.
- Chưa làm: tick E2E-AC-8 (cần verify-ac/QA độc lập), code-review delta, `run.md` theo AGENTS.md, SPRINT.md S8-07.
