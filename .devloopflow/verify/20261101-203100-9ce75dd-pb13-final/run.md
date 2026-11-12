# PB-13 — kiểm chứng tiếp tục ngày01/11/2026

**Trạng thái:** hoàn tất triển khai/kiểm chứng local trong scope PB-13 tổ chức; reviewer không còn finding, QA đã đóng đối chiếu C01..C20. Chưa có CI/runner độc lập hoặc nghiệm thu Product Owner.

Tiếp nối `../20261030-214100-9ce75dd-pb13-organization-ui/` với raw artifacts lịch sử giữ nguyên. Nhánh feat/pb13-organization-ui, base/HEAD9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18, dirty PB04+PB13. Phiên trước đã hết process/browser; Docker được khởi động lại. Tiếp tục DB QA riêng pos_pb13_browser_31b5333d5cbf, không dùng DB ứng dụng. Browser MCP không còn khả dụng; dùng Playwright đã có trong npm cache và Chrome local, không thêm dependency repository.

## Ma trận trước lượt chạy mới

| Tiêu chí còn lại/bản cuối | Tình huống | Artifact sẽ lưu |
| --- | --- | --- |
| Nhận diện bản cuối | UI test/typecheck/build, API regression và source/runtime/config hashes | stdout, command start/end/exit, env và manifests |
| Current branch/permissions | MANAGER đang đăng nhập đổi fixture branch, focus revalidate bỏ rows cũ; default không có staff | browser snapshots/screenshots, request/response, DB readonly trước/sau; fixture update ghi rõ không phải API sản phẩm |
| Store suspended/reauth | platform suspend/activate qua UI, owner/staff oldcookie revoked, dữ liệu giữ nguyên | UI/network + stores/sessions DB trước/sau |
| Expired access | Xóa riêng access cookie, giữ refresh; một lần refresh và request retry đúng actor | cookie metadata không giá trị, network gốc đã che, snapshots |
| Cursor/readrace/offline/error bản cuối | >100choices/>20pages; giữ response SQL thật rồi đổi branch; lỗi tải/retry/offline | exact IDs + raw network, before/after snapshot/image/DB |
| Final UI/modal/secret | smoke cuối ba tab, primary56/touch48,1024/768, keyboard, secret no storage | metrics/images/snapshots, safe boolean assertions |
| Review/QA/closure | đối chiếu cả2runs và đúng source, sửa thiếu trước khi complete | review.md/audit.md; không dùng số pass thay bao phủ |

Không viết lại log cũ hoặc dựng chứng cứ sau phiên. Các hành vi đã có ở B32/B40..51/B33..35 của run trước sẽ được liên kết đúng phiên bản/giới hạn; không mô tả chúng là lượt chạy mới.

## Kết quả chạy thật

- UI tại POS_UI: `npm test`, `npm run typecheck`, `npm run build`, bắt đầu01/11/2026 **20:37:24.2092302+07:00**, kết thúc **20:37:44.1077641+07:00**, cả ba exit0. [ui-tests-final.log](evidence/ui-tests-final.log) **28/28 top-level TAP tests**,0 fail/skip/cancel; [typecheck-final.log](evidence/typecheck-final.log), [build-final.log](evidence/build-final.log). ui-tests.log27/27 là lượt trước bổ sung kiểm lỗi404/409/503 và create network failure, không dùng làm bản cuối.
- API tại POS_API: `npm test`, bắt đầu **20:40:44.7453429+07:00**, kết thúc **20:43:07.4939125+07:00**, exit0. [api-tests-2.log.gz](evidence/api-tests-2.log.gz) **48 TAP nodes** (13 top-level+35 nested),0 fail/skip/cancel. Lượt đầu [api-tests.log.gz](evidence/api-tests.log.gz)47pass1fail do DROP DATABASE cleanupfoundation bị57014; giữ [server context](evidence/db-timeout-context.log), không nới timeout/bỏ assertion hoặc sửa backend. Rerun qua sau browser đóng không chứng minh nguyên nhân sâu của timeout là tải/I/O/lock; [error record](../../errors/2026-11-01-pb13-api-qa-cleanup-timeout.md) nêu giới hạn.
- Browser: `node --env-file-if-exists=.env ../qa-evidence/20261101-203100-9ce75dd-pb13-final/browser-final.cjs` tại POS_API, **20:35:30.0885204→20:36:09.4601697+07:00**, exit0; [browser-1.log](evidence/browser-1.log), [result](evidence/browser-1/browser-result.json), [129 network records](evidence/browser-1/browser-network.jsonl), [case timestamps](evidence/browser-1/browser-cases.jsonl). Chrome156 qua Playwright có sẵn trong npm cache, không dependency mới của sản phẩm. Driver có DeprecationWarning khi gửi query đồng thời trên một pg client; ghi stderr gốc, không tính warning là lỗi sản phẩm.
- [Environment](evidence/environment.log) ghi fullHEAD/branch/dirty, Node/npm/PG thực; PB-04/PB-13 chưa có commit riêng. Dùng manifests bên dưới để nhận diện source cuối; không gọi HEAD/base là commit đã chứa PB-13.

## Tiêu chí → tình huống → artifact

| Phần cần chứng minh | Artifact gốc cụ thể |
| --- | --- |
| Đủ10 thao tác PB04 qua UI và DB; nullable/money/capacity/status | Run30/10 B40..45/46..49 có network và từng before/after DB; B50/B51 nullable clear và B51b metrics56+mutation. Đây là replay sau rowsKey fix; chỉnh kích thước nút sau đó được kiểm riêng B33/B34/B49/B51b, không dùng ảnh cũ thay hình cuối |
| Cấp/reset mật khẩu,2devices,old/newlogin,locked/unlock/selfreset | Run30/10 B45 storage/protected/cleared, B46/B47 hai thiết bị và role/reset active2→0, B48 khóa/resetlocked/unlock, B49 self-reset không GET trước ack. Các N02/N03 của run này xác minh lại handoff/force-change sau khôi phục môi trường |
| Scope/identity/currentpermission/currentbranch | [N01 fixture](evidence/browser-1/N01-setup.json), [N04 before/after DB](evidence/browser-1/N04-current-branch-db.json), N03-manager-A1/N04-current-branch-A2 và N05-current-permission-before/after ảnh+snapshot; [N05 DB](evidence/browser-1/N05-permissions-db.json). Reassign/grant chỉ là fixture trực tiếp trong DB QA, không phải feature chuyển chi nhánh/quản trị quyền |
| Crossidentity401 không replay form cũ | Run30/10 B32-session-race.json + snapshots/network thực: oldcookie401 sau siblinglogout/loginA→B, chỉ một POST, không branchXS; helper tests kiểm same guard. Không dùng cookie/token value trong artifact |
| Cursor/filter/choices/oldread | [N06 exact105 codes/6pages/choices](evidence/browser-1/N06-pagination.json), N07-query-held/A2-before-release/stale-rejected ảnh+snapshot; server response SQL thật được giữ rồi nhả, A1 rows/cursor không ghi đè A2. Run30/10 B25/B25b bổ sung26tables/25staff exactset và combo filters; payload/pagination service không đổi sau các bugfix render |
| Loading/empty/offline/error/retry | N07 skeleton và N08-offline/list-error/list-retry ảnh+snapshot/network; controlled UI tests cho active-tab, tab/branch/status/role/page/unmount,422field,409/404/503 giữform và chỉ404reload |
| Auth refresh/store status/platform | [N09 cookie metadata](evidence/browser-1/N09-cookies.json) và N09-access-expired-before/restored: một refresh thành công trong cửa sổ case. N10-platform/suspend-before/suspended-owner/reactivate-old-denied/reactivate-new-login; [stores/sessions DB](evidence/browser-1/N10-suspend-db.json), [readonly state cuối ACTIVE](evidence/final-db.json). Toàn run có thêm refresh401 kỳ vọng sau suspend, không nói toànrun chỉ một refresh |
| Layout/touch/keyboard | [N11-1024 metrics](evidence/browser-1/N11-layout-1024.json), [N11-768 metrics](evidence/browser-1/N11-layout-768.json), ảnh cùng tên: no pageoverflow/min48. N12-keyboard-trap/return ảnh+snapshot. Run30/10 B51b-confirm-metrics.json đo56 sau modal animation ổn định |

Tất cả B* nằm ở [run30/10](../20261030-214100-9ce75dd-pb13-organization-ui/run.md); ảnh/password được che và snapshot/network che giá trị secret. B00..31 là lịch sử trước sửa render, chỉ dùng hỗ trợ nếu nêu rõ; không thay final replay. QA đối chiếu từng C01..C20 tại [audit.md](audit.md); reviewer code ở [review.md](review.md).

## Nhận diện phiên bản và đọc lại

- [UI source/config/tests](evidence/ui-source-manifest.json):73 files; [UI build runtime](evidence/ui-runtime-manifest.json):3 files. [API source/config](evidence/api-source-manifest.json):66; [API JavaScript](evidence/api-runtime-manifest.json):64; [contract](evidence/contract-manifest.json):12; [QA scripts](evidence/tooling-manifest.json):3. SettingsScreen hash do browser runner thu khớp manifest/source cuối.
- API stdout gốc UTF16LE được nén gzip lossless; [compressed-logs.json](evidence/compressed-logs.json) lưu raw/gzipSHA256/kích thước và bản raw ngoài repository, đã giải nén so byte identity. Đọc bằng Python `gzip.decompress(Path(file).read_bytes()).decode('utf-16')`. Không viết lại nội dung raw để khớp kết luận.
- Lệnh/giờ/exit thực: [commands.log](evidence/commands.log). Tái chạy service/UI/API theo package scripts. Browser runner dùng isolated QA DB/fixture do run30/10 tạo; cần khôi phục fixture đúng hướng dẫn/nhật ký, không chạy trên DB vận hành. Private credentials ngoài repo; không đưa file này vào Git.

## Giới hạn

Các helper API/Vite do task tạo đã dừng theo PID+command được xác minh, ghi [teardown.json](evidence/teardown.json); exit1 của các process server khi dừng có chủ đích không phải exit của test. SharedPostgreSQL và DBQA riêng giữ để tái hiện; không xóa dữ liệu ứng dụng.

Bằng chứng local do agent chạy, reviewer/QA đọc lại; chưa có CI/runner độc lập cho working tree này. Không claim mọi lịch đồng thời, browser/storage bên ngoài các case hoặc toànbộ PB-13 sản phẩm. Quỹ sau ca PB-06, POS/ca/thực đơn/kho/báo cáo còn ngoài scope; chưa kiểm production hoặc tự nghiệm thu Sprint3. Không commit/push/merge tự động.
