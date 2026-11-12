# QA đối chiếu PB-13 — bản cuối

**Trạng thái:** hoàn tất đối chiếu; không còn gap trọng yếu đang mở trong phạm vi UI tổ chức PB-13 đã chốt. Đây là xác minh local, không phải nghiệm thu Product Owner hoặc đóng Sprint3.

QA chỉ đọc source/test/spec và artifact do agent chính thực thi; không sửa implementation, test hoặc cấu hình và không chạy thêm bộ test độc lập. Đã đọc AGENTS.md, PRODUCT_OVERVIEW, BUSINESS_RULES liên quan, rules/testing.md, plan/spec UI/API. Graph không có Settings symbol nên đọc source hiện hành trực tiếp.

## Phiên bản và thực thi đã đọc

- Nhánh feat/pb13-organization-ui, HEAD/base9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18; working tree dirty gồm PB04 và PB13, chưa có commit PB13 riêng. Không coi HEAD/base là commit đã chứa thay đổi.
- O là [run30/10](../20261030-214100-9ce75dd-pb13-organization-ui/run.md); N là run này. Artifact O được giữ nguyên, không mô tả thành lần chạy01/11.
- UI npm test/typecheck/build ngày01/11,20:37:24.2092302→20:37:44.1077641+07:00, cả ba exit0. Đã mở ui-tests-final.log: **28 top-level TAP nodes,0 fail/skip/cancel**, gồm một test kiểm409/404/503. Không gọi28 tiêu chí nghiệp vụ độc lập.
- API npm test20:40:44.7453429→20:43:07.4939125+07:00, exit0; api-tests-2.log.gz **48 nodes,13 top-level+35 nested,0 fail/skip/cancel**. Lần đầu api-tests.log.gz47pass1fail do foundation cleanup DROP DATABASE bị statement timeout. Server context có query thật; nguyên nhân sâu tải/I/O/lock chưa xác minh. Không suy rerun qua là đã sửa lỗi production.
- Browser command20:35:30.0885204→20:36:09.4601697+07:00, exit0. Đã mở browser-1.log/result:129 network records, Chrome156.0.8078.74,105branch choices/6pages. Warning concurrent query trên pg client là cảnh báo driver QA giữ nguyên, không phải finding sản phẩm.
- Đã rehash **UI source/config/tests73, UI runtime3, API source/config66, API runtime64, contract12, tooling3:221entries,0 mismatch**. SettingsScreen hash do browser runner ghi trùng source/manifest. Hai gzip đã so raw/gzip SHA256/kích thước/decompression và bytes raw archive ngoài repo: đều khớp.
- Environment.log thực ghi Node22.22.2/npm10.9.7/PostgreSQL17.9 Docker, fullHEAD/branch/dirty. DB QA riêng pos_pb13_browser_31b5333d5cbf; direct seed/grant/reassign ghi rõ fixture, không phải API chuyển chi nhánh hoặc sửa quyền mặc định.

## Ma trận tiêu chí → tình huống → artifact

| ID | Expected và đối chứng thực | Kết luận |
| --- | --- | --- |
| C01 | OWNER vào Cài đặt/3tab, header không branch/shift demo: PB13-NAV, O/B32/B33, N/N11-layout PNG; đã xem ảnh768. | Đủ scope UI đã kiểm. |
| C02 | Branch code/case/nullable/cash: PB13-FORM giữ0/trần1e12, chặn âm/thập phân/coercion; O/B40/B41 DB tạo/sửa, B50 phone→null; B07 lịch sử hỗ trợ addressclear/code giữ nguyên. | Đủ biên/test/runtime; không claim sau ca PB06. |
| C03 | Ngưng/mở branch giữ dữ liệu: O/B42/B42b DB/snapshot/network PATCH. | Đủ local. |
| C04 | Table đúng branch, optional area/capacity, không mock occupancy: PB13-SCOPE, O/B43/B44 create/edit, B51 area/capacity→null; Form test min/max/null. | Đủ local. |
| C05 | Table ngưng/mở, không delete/move: O/B44b/B44c; O/B51b final confirmation+DB giữ bảng. | Đủ local. |
| C06 | Staff chỉ MANAGER/CASHIER,branch bắt buộc,không profile edit: O/B45; PB13-HTTP/SCOPE và form/source; O/B13/B14 hỗ trợ tạo hai vai trò trước renderfix. N02/N03 xác minh reset/force-change trên hợp đồng hiện hành. | Đủ capability/contract; không thêm hierarchy reset ngoài spec. |
| C07 | Role/reset/lock revoke; unlock không phục hồi; resetlocked giữ khóa: O/B46-role tổngactive8→6, B47-reset8→6, B48-lock7→6, B48b giữfalse, B48c-unlock cùng old-session401/newlogin. | Đã đối chiếu DB/HTTP. |
| C08 | Password once/ack/copy/manual/no storage/URL/toast/log/clear: PB13-SECRET; O/B45 protected/cleared/storagefalse; B49 handoff. Clipboard-denied/manualselection O/B18 là lịch sử hỗ trợ handler, không gọi là lượt N. N02/N03 modal/force-change, PNG mask/network che secret. | Đủ scope; không claim mọi browser/OS clipboard. |
| C09 | Self-reset không GET trước ack rồi logout: O/B49-self-reset-db active7→6/listRequestsUnchanged; snapshot password/ack/logout; PB13-SECRET self-reset. Đã xem PNG mask/ackdisabled. | Đủ local cho customgrant fixture, default permissions không đổi. |
| C10 | Cookie/CSRF/401 một refresh, không replay unknown hoặc khácactor: PB13-HTTP có create/reset networkfailure1send; O/B32 actual401/1POST/noXS và publicrows không đổi. N09 cookie metadata/accessremoved/deltaPOSTrefresh1success+GETretry. | Đủ lịch đã kiểm. Toàn N thêm refresh401 kỳ vọng sau suspend; không nói toànrun chỉ1refresh. |
| C11 | Currentpermission/branch/session đổi cleardata/form: O/B35 tabs2→1; O/B32 siblinglogout/login clearform; N04 same-session A1→A2, N05 grant/form rồiremove/revalidate clearsform. DB directfixture được ghi rõ. | Đủ current scope đã chốt. |
| C12 | MANAGER branch only,CASHIER/platform khôngorg: PB13-SCOPE/NAV; N03 chỉBàn/A1; N04 ảnhA2 đúng2bàn khôngA1; N10-platform khôngorg. CASHIER view O/B17 hỗ trợ cùng currentpermissions gate. | Đủ local, không coi màn mock là backend thật. |
| C13 | Cursor20/prevnext/total/filter/choices>100: N06 exact105codes/6pages/0duplicate/105choices; O/B25 tables26 vàB25b staff25 exactset/combo filter hỗ trợ cùng service/payload. | Đủ fixtures đã kiểm, không hứa snapshot giữa nhiều mutation. |
| C14 | Response cũ không đổirows/error/loading/meta/cursor: PB13-RACE deferred tab/branch/status/role/page/unmount; N07 giữ actual SQL A1 response, A2 hoàn tất trước, nhả A1 vẫnA2/noA1cursor. | Đủ lịch đã ép, không suy mọi lịch có thể xảy ra. |
| C15 | Active-tab không kẹt, đổitab không render sai schema: O/ui-tests-2/7 red; finalUI thực thi realcolumns; O/B45-final-reload và N11/N12 tab switches không crash. | Có red/green/browser. |
| C16 | Pending chặnduplicate/close,422field/409form/404reload/503error: PB13-MUTATION/HTTPdetails; final PB13-ERROR asserts editor retained409/404/503 và chỉ404 tăng listread. O/B08 là409browser lịch sử; deterministic tests hỗ trợ các errorcodes không ép liveDB. | Đủ mức kiểm thử phù hợp, không claim browser đã gây mọi errorcode. |
| C17 | Loading/empty/error/retry/offline disablewrite: N07 skeleton, N08 offline/readerror/retry PNG/snapshot/network-failure; source listeners và deferredtests. | Đủ local. |
| C18 |1024/768,48touch/56primary,keyboard trap/restore,nooverflow: N11 docWidth=viewport/minheight48 và PNG; N12 keyboard assertions/captures. O/B51b settledheight56+mutation/DB. Đã xem N11-768. | Đủ hai kích thước đã chốt; không claim mọi mobile/zoom/thiết bị. |
| C19 | Auth/platform/backend regression và version binding: finalUI28/typecheck/build0; finalAPI48 sau retry; manifests221match; rawnetwork/cookie/status và red/green. | Đủ local; cleanupfail/warning lịch sử nêu rõ, chưa CI. |
| C20 | PB06/ca/POS/production/CI/Sprint3 không tự tính hoàn tất | Plan/spec/run giới hạn rõ, không tick nghiệm thu thay Product Owner. | Giữ giới hạn. |

## Đối chứng raw/artifact

- Đã parse O/browser-network.jsonl498 records và N/browser-1/browser-network.jsonl129 records. N có80response200/48response401/1response204; password/token/cookie/CSRF string đều REDACTED, không phát hiện trường secret string chưa che trong network. Cookie artifact chỉmetadata.
- O/B32 branches/tables/users trước=sau; sessions đổi theo logout/login hợp lệ. Không gán sessionchange cho POST cũ401. Không branchXS, chỉ1POST sau release.
- N06 actualCodes/expectedCodes cùng105,exactset,0duplicate,6pages/choiceCount105. Seed không được dùng chứng minh tạo qua UI.
- N04 DB/snapshot/PNG chứng minh cùng phiên A1→A2 qua fixture; N05 formCleared cùng key identity bảo vệ phạm vi. Đã xem N04 ảnh đúng2bàn QA Vườn/chỉtabBàn.
- N10-suspend-db ACTIVE→SUSPENDED, branches/tables giữ nguyên/sessions bị thu hồi. HTTP/ảnh ownerlogout, reactivate không phục hồi oldcookies và explicitnewlogin; final-db.json readonly cuối cả2storeACTIVE. Không dựng lại response hoặc DBsnapshot từ trí nhớ.
- O/B50 phone→null, B51 area/capacity→null đúng rawDB. O/B49 selfpassword ảnhmask/ackdisabled56 và B35-permission-after chỉBàn đã mở trực tiếp.
- SettingsScreen hash trong N/browser-result.json trùng file thực; hai gzip checksum/kích thước/decompression/rawarchive bytes khớp. UI/typecheck/build/commands start/end/exit đã mở lại.
- O/B00..31 là lịch sử trước rowsKey, không thay UIcuối. O/B40..47 hỗ trợ payload/DB sau rowsKey; size-only chỉnh nút được kiểm lại O/B48..51/B33/B34 và N11/N12. Không suy timestamps khác nhau là đã chạy trong cùng một lần.

## Kết luận và giới hạn

Không thấy runtime finding mới hoặc thiếu bằng chứng trọng yếu còn mở trong phạm vi UI tổ chức PB13 của kế hoạch đã chốt. Ba lỗi triển khai có chứng cứ trước/sau sửa; finalrunner/browser hỗ trợ đúng phần được kết luận từng hàng, không phải xác nhận mọi kịch bản hoặc toàn bộ sản phẩm PB13.

Bằng chứng do agent chính chạy local, QA đọc/rehash/mở ảnh đối chiếu. Chưa có CI/runner độc lập hoặc nghiệm thu Product Owner; không kiểm production, POS/ca/thực đơn/kho/báo cáo và khóa quỹ sau ca PB06. Lần timeout cleanup đầu có log/retry qua nhưng nguyên nhân sâu chưa xác minh; giữ trong báo cáo.

Nếu sau audit thay contract/docs hoặc chuyển plan/task thì cập nhật manifest tương ứng và rehash cuối; không cần chạy business tests cho thay đổi liên kết/tiến độ thuần tài liệu. Không merge/push/commit từ kết luận QA này.
