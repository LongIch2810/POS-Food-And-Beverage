# Sổ FAIL của task 20261115-sprint10-stock-ledger

- Task: 20261115-sprint10-stock-ledger
- Cập nhật lần cuối: 2026-11-16 (sau lần verify-ac thứ 3)
- Điều kiện đóng task: không còn mục trạng thái `mở` và kết quả mới nhất của mọi AC còn trong plan đã duyệt là PASS.

## Tổng hợp
| Id | AC | Loại | Trạng thái | Phát hiện ở lần | PASS ở lần | Report | Bằng chứng |
|---|---|---|---|---|---|---|---|
| V1-1 | E2E-AC-1, E2E-AC-6, E2E-AC-11 | Môi trường | đã PASS | 1 | 2 | report-2.md | evidence/r2-results.json; evidence/r2-E2E-AC-1-owner-all.png; evidence/r2-E2E-AC-6-manager-header.png; evidence/r2-E2E-AC-11-options.png |
| V1-2 | Spec ràng buộc dòng68,71 | Spec | đã PASS | 1 | 2 | report-2.md | evidence/r2-documents.json; evidence/r2-auth-test.log |

## Lịch sử kiểm lại vòng 3
- 2026-11-16 — report-3.md — PASS trong phạm vi ST-6.AC-11, ST-10.AC-2, ST-10.AC-5 và exploratory B-65. Không phát hiện FAIL mới; V1-1/V1-2 giữ `đã PASS`, không chạy lại hai mục này và không thay bằng chứng/lịch sử cũ.
- Bằng chứng: `evidence/r3-unit-test.log` (3/3), `evidence/r3-browser-test.log` (2/2), `evidence/r3-build.log` (exit 0), `evidence/r3-live-dialog.json`, `evidence/r3-ST10AC5-mcp.json`, các screenshot `r3-B65-*.png`, `r3-ST10AC2-back.png`, `r3-ST10AC5-*.png`.
- App/API thật: dialog Thêm nguyên liệu và Đặt ngưỡng tồn đóng khi Back sang tab khác, không tự mở lại khi Forward. Đổi phiên chỉ kiểm bằng fetch giả được ST-10 quy định; chưa kiểm lại đổi phiên API/DB thật vì thiếu credential fixture. E2E-AC-9 và 76 AC còn lại không chạy lại; không suy PASS mới cho chúng.
- Vòng 3 không sửa code, test, plan, task, backlog hoặc Git; không sửa tài khoản/fixture và không submit dialog. Graph có marker cần cập nhật, verifier không dùng graph cũ hoặc xóa marker.

## Chi tiết từng FAIL

### V1-1 — E2E-AC-1, E2E-AC-6, E2E-AC-11
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261115-sprint10-stock-ledger/report-1.md`).
- Loại: Môi trường (fixture không khớp mô tả plan; không tái hiện bug production).
- Kỳ vọng theo plan (nguyên văn):
> - [ ] E2E-AC-1 (S10-11 vế "dữ liệu thật theo quyền và chi nhánh"; mục tiêu spec M1): Given `zzsokho_owner_a` đăng nhập, When mở `http://localhost:5173/kho/so-kho` với "Tất cả chi nhánh", Then network có `GET /api/v1/stock-movements?limit=100` (và trang tiếp nếu có) status 200, số dòng bảng = `SELECT count(*) FROM stock_movements m JOIN branches b ON b.id=m.branch_id WHERE b.store_id='29f61b69-b425-4b34-a0fe-fa3a4678540b'`, bảng có cột "Chi nhánh" mỗi dòng là `ZA1`/`ZA2` khớp `branches.name` của `m.branch_id`; chọn chi nhánh `ZA1` → request có `branchId=fb639e97-a646-4973-9672-7ab102d0edca`, không còn cột "Chi nhánh", số dòng = count DB của ZA1; `zzsokho_manager_b1` mở `/kho/so-kho` → không có ô chọn chi nhánh, không có cột "Chi nhánh", request không có `branchId`, chỉ dòng ZA1 (kiểm: browser + network + SQL).
>
> - [ ] E2E-AC-6 (mục tiêu spec L3): Given `zzsokho_manager_b1` đăng nhập (không có ca mở), When mở `/kho/so-kho`, Then tiêu đề trên cùng là `ZA1`, không có chữ "Tất cả chi nhánh" trong `header`; `GET /api/v1/auth/me` trả `data.user.branchName = "ZA1"`; OWNER A ở `/kho/so-kho` tiêu đề "Tất cả chi nhánh" và `branchName: null` (kiểm: browser + curl).
>
> - [ ] E2E-AC-11 (mục tiêu spec V1): Given OWNER A tạo thêm (qua `POST /api/v1/branches` hoặc UI Cài đặt) hai chi nhánh thử `{code:'ZA10',name:'ZA10'}` và `{code:'ZDD1',name:'ZĐ1'}` ngoài `ZA1`, `ZA2`, `ZA3` sẵn có, When mở ô chọn "Chi nhánh kho", Then thứ tự option là "Tất cả chi nhánh", "ZA1", "ZA10", "ZA2", "ZA3", "ZĐ1" ("ZA10" trước "ZA2": so chữ thuần; "ZA3" trước "ZĐ1": A trước Đ theo tiếng Việt) (kiểm: browser).
- Tài liệu nguồn (nguyên văn): “Tiêu đề hiện đúng tên chi nhánh của người bị gắn một chi nhánh; "Tất cả chi nhánh" chỉ cho người có quyền xem mọi chi nhánh (L3).” (.devloopflow/specs/20261115-sprint10-stock-ledger.md:29); “Ô chọn chi nhánh trên màn Kho xếp theo tên (V1, phần ô chọn).” (.devloopflow/specs/20261115-sprint10-stock-ledger.md:33). API/UI phải trả/hiện tên thực. Dữ liệu thử current-state.md ghi B1/ZA1 như mã, không chứng minh name là ZA1.
- Thực tế: DB/UI dùng `ZZ Chi nhanh B1`, `ZZ Chi nhanh B2`, `ZZ Chi nhanh B3 rong`; header manager và /auth/me là `ZZ Chi nhanh B1`. Options sau seed: Tất cả chi nhánh, ZA10, ZĐ1, ZZ Chi nhanh B1, ZZ Chi nhanh B2, ZZ Chi nhanh B3 rong. Dữ liệu cột,153dòng/branch1 12dòng và sắp tên tiếng Việt đều đúng DB; expectation nguyên văn không đạt.
- Bước tái hiện: rebuild app; đăng nhập owner thử; /kho/so-kho đọc names/options; SQL SELECT code,name FROM branches WHERE store_id='<storeA>'; đăng nhập manager thử và GET /auth/me. Không đổi tên fixture trong QA.
- Path bằng chứng: `evidence/r1-live-results.json` E2E1/6/11, `evidence/r1-followup2-results.json` actualScope/actualManager/actualSort/authMe, ảnh r1-actual-owner-branches.png/r1-actual-manager.png.
- Test tái hiện đề xuất: `E2E fixture branch names agree with approved AC` | input: ba branch thử hiện có và AC1/6/11 | kết quả mong đợi: plan và fixture cùng tên đã được user chốt; UI/API khớp DB, options đúng localeCompare vi. Không đề xuất sửa production hiện tại.
- Trạng thái: đã PASS.
- Lịch sử trạng thái (chỉ thêm): 2026-11-15 — lần1 — FAIL — evidence/r1-live-results.json; evidence/r1-followup2-results.json.
- Lịch sử trạng thái (chỉ thêm): 2026-11-15 — lần2 — PASS — E2E-AC-1/6/11: 153 dòng toàn store, 12 dòng ZA1 và manager, header ZA1, curl me ZA1/null, thứ tự option đúng AC; evidence/r2-results.json và ảnh r2-E2E-AC-*.png. Hash/cờ hai tài khoản đã khôi phục và xác minh true; không đổi dữ liệu branch trong QA.
- Lý do huỷ: không áp dụng; chưa có changelog user duyệt đổi/bỏ AC.
- Ai sửa, file đã sửa, file errors/: agent chính đổi tên ba branch thử theo quyết định user thành `ZA1`, `ZA2`, `ZA3` và truy vấn DB xác nhận sau COMMIT; không sửa source, không áp dụng errors/ cho dữ liệu fixture. Chưa verify-ac lại.

### V1-2 — Ràng buộc spec tài liệu auth/tech stack cùng code
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261115-sprint10-stock-ledger/report-1.md`).
- Loại: Spec.
- Kỳ vọng theo plan/spec (nguyên văn): “cập nhật spec/tài liệu auth liên quan cùng lúc với code” (.devloopflow/specs/20261115-sprint10-stock-ledger.md:68); “cập nhật POS_UI/package.json, package-lock.json và docs/architecture/TECH_STACK.md cùng thay đổi” (.devloopflow/specs/20261115-sprint10-stock-ledger.md:71). Plan mục Tài liệu cần cập nhật đã dự kiến sync-docs trước commit.
- Tài liệu nguồn (nguyên văn): `.devloopflow/specs/auth.md:92`: “UserSummary chỉ gồm id, username, fullName, role (mã vai trò), storeId, branchId, permissions (mảng mã quyền), mustChangePassword.” (inline backtick của tài liệu được bỏ khi trích); docs/architecture/TECH_STACK.md:23 còn ghi “màn Báo cáo còn mô phỏng, Kho còn mô phỏng tab lịch sử biến động.”; không có react-router-dom.
- Thực tế: API login/me/refresh đã thêm branchName, UI đã cài7.18.5 và dùng BrowserRouter; hợp đồng auth và tech stack chưa cập nhật. Test tương thích9field đạt, không có lỗi runtime được tái hiện.
- Bước tái hiện: đọc .devloopflow/specs/auth.md:26-35,92; docs/architecture/auth.md:31,36; đọc docs/architecture/TECH_STACK.md:20-25; rg branchName/react-router-dom trong các tài liệu đó; đối chiếu spec68/71 và package/source hiện hành.
- Path bằng chứng: source nêu trên; `evidence/r1-code-sha256.json` chốt hash bản QA; `evidence/r1-api-test.log` ST2-AC1..5 và `evidence/r1-ui-test.log` ST8-AC9.
- Test tái hiện đề xuất: `auth and frontend docs match current session and router contract` | input: các tài liệu hiện tại | kết quả mong đợi: branchName nullable trong response phiên; react-router-dom7.18.5, router URL tab, Kho dùng API thật ghi đúng; các hợp đồng cũ giữ nguyên phần không liên quan. Đây là sửa tài liệu theo sync-docs, không cần tạo test production.
- Trạng thái: đã PASS.
- Lịch sử trạng thái (chỉ thêm): 2026-11-15 — lần1 — FAIL — spec68/71 so với auth.md/TECH_STACK.md hiện hành.
- Lịch sử trạng thái (chỉ thêm): 2026-11-15 — lần2 — PASS — Ba tài liệu auth/architecture/tech stack khớp SessionUser.branchName nullable và react-router-dom7.18.5; package/lock/source hash không đổi so vòng1; test auth tập trung6 pass0fail; release2026-10-27 đủ14ngày; evidence/r2-documents.json, evidence/r2-auth-test.log.
- Lý do huỷ: không áp dụng; chưa có changelog user duyệt bỏ ràng buộc.
- Ai sửa, file đã sửa, file errors/: agent chính cập nhật `.devloopflow/specs/auth.md`, `docs/architecture/auth.md`, `docs/architecture/TECH_STACK.md` theo quyết định user; không sửa code, không áp dụng errors/ cho cập nhật tài liệu. Chưa verify-ac lại.
