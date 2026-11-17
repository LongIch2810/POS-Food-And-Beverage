# Sổ FAIL của task 20261116-orm-entities-refactor
<!-- Do ac-verifier tạo và cập nhật sau MỖI lần chạy verify-ac, nằm ở .devloopflow/verify/20261116-orm-entities-refactor/fails.md. Chỉ thêm, không xoá mục cũ. Không ghi secret/PII; bằng chứng thô ở evidence/ (bị .gitignore chặn). -->

- Task: 20261116-orm-entities-refactor
- Cập nhật lần cuối: 2026-11-17 (sau lần verify-ac thứ 2)
- Điều kiện đóng task: không còn mục trạng thái `mở` (mục `huỷ do đổi plan/spec` không tính) và kết quả mới nhất của mọi AC còn trong plan đã duyệt là PASS.

## Tổng hợp
| Id | AC | Loại | Trạng thái | Phát hiện ở lần | PASS ở lần | Report | Bằng chứng |
|---|---|---|---|---|---|---|---|
| V1-1 | E2E-AC-7, ST-1.AC-1 | Sai | đã PASS | 1 | 2 | report-1.md, report-2.md | evidence/r1-npm-test.log, POS_API/src/database/tests/entity-schema.integration.test.ts |
| V1-2 | ST-12.AC-5, ST-13.AC-1, ST-15.AC-3, ST-16.AC-4 | Không có chứng cứ | đã PASS | 1 | 2 | report-1.md, report-2.md | evidence/r1-per-file-counts.txt |
| V1-3 | E2E-AC-10, ST-18.AC-5 | Không có chứng cứ | đã PASS | 1 | 2 | report-1.md, report-2.md | evidence/r1-E2E-AC-10-graphify.txt |

- Loại: Sai | Spec | Lệch tài liệu | Không có chứng cứ | Môi trường | errors/ thiếu
- Trạng thái: `mở` | `đã PASS` | `huỷ do đổi plan/spec`

## Chi tiết từng FAIL

### V1-1 — E2E-AC-7, ST-1.AC-1
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261116-orm-entities-refactor/report-1.md`)
- Kỳ vọng theo plan (nguyên văn): "test `test_ST1_AC1_entity_metadata_matches_schema` xanh" (plan active:391; bảng ma trận dòng 1649)
- Tài liệu nguồn: plan là nguồn duy nhất; CLAUDE.md "Tên test mang mã tình huống"
- Thực tế: không có test tên đó (`grep -rn` trong `POS_API/src` rỗng); test tương đương `ST-1.AC-1 entity metadata matches schema` ok trong `evidence/r1-npm-test.log` (dòng 115). Nội dung đúng: 32 entity, 12 bảng khớp.
- Bước tái hiện: `grep -rn "test_ST1_AC1_entity_metadata_matches_schema" POS_API/src`
- Test tái hiện đề xuất: đổi tên test hoặc sửa chữ plan sau duyệt | input: `npm test` + grep tên | mong đợi: test đúng tên ok
- Trạng thái: đã PASS (PASS ở lần 2)
- Lịch sử trạng thái (chỉ thêm): 2026-11-17 — lần 1 — FAIL — evidence/r1-npm-test.log
- Lịch sử: 2026-11-17 — lần 2 — PASS — grep ra `entity-schema.integration.test.ts:36`; `npm test` 350/350, `ok 13 - test_ST1_AC1_entity_metadata_matches_schema`; entities = 32 — evidence/r2-npm-test-verifier.log, evidence/r2-E2E-AC-7-entities-count.txt
- Ai sửa, file đã sửa, file errors: agent chính đổi tên test; `.devloopflow/errors/20261117-orm-refactor-existing-test-lines-edited.md` (cùng nhóm lỗi quy trình test cũ)

### V1-2 — ST-12.AC-5, ST-13.AC-1, ST-15.AC-3, ST-16.AC-4
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261116-orm-entities-refactor/report-1.md`)
- Kỳ vọng theo plan (nguyên văn): `grep -c "// QueryBuilder:" sales/sales.service.ts` = 0 sau ST-12 / = 4 sau ST-13 / = 5 sau ST-15 / = 10 sau ST-16 (plan active:1147, 1183, 1273, 1328)
- Tài liệu nguồn: plan
- Thực tế: evidence `ST-12/13/15/16` không có log grep marker; trạng thái cuối 11 khớp E2E-AC-11 và ST-17.AC-3 (`evidence/r1-per-file-counts.txt`).
- Bước tái hiện: `grep -rl "QueryBuilder:" evidence/ST-12 evidence/ST-13 evidence/ST-15 evidence/ST-16` không có kết quả
- Test tái hiện đề xuất: bổ sung log grep đã lưu của tdd vào evidence, hoặc user duyệt bỏ các mốc trung gian | mong đợi: chứng cứ có hoặc AC đổi
- Trạng thái: đã PASS (PASS ở lần 2)
- Lịch sử trạng thái (chỉ thêm): 2026-11-17 — lần 1 — FAIL — evidence/r1-per-file-counts.txt
- Lịch sử: 2026-11-17 — lần 2 — PASS — AC đổi nội dung theo duyệt user (changelog plan:1855, nguyên văn "chọn 1, bỏ bốn mốc"); bốn dòng AC (plan active và approved) không còn mốc trung gian; `npm test` xanh 350/350; `setLock(` 0; sales.service.ts = 11, tổng 42 — evidence/r2-per-file-counts.txt, evidence/r2-npm-test-verifier.log
- Ai sửa, file đã sửa, file errors: agent chính sửa plan active và approved (không sửa mã)

### V1-3 — E2E-AC-10, ST-18.AC-5
- Phát hiện ở lần: 1 (report: `.devloopflow/verify/20261116-orm-entities-refactor/report-1.md`)
- Kỳ vọng theo plan (nguyên văn): "chạy `graphify update .` ở gốc repo và semantic update cho 3 file Markdown, Then lệnh exit 0 và `graphify query ... ` trả về nút từ `rules/database.md`" (plan active:396, 1615)
- Tài liệu nguồn: `CLAUDE.md` mục Graphify (semantic update sau khi sửa Markdown)
- Thực tế: query trả nút `TypeORM repository methods first ... [src=rules/database.md loc=L16]`; không có log `graphify update .`/semantic update, không có thư mục `evidence/ST-18`.
- Bước tái hiện: chạy `graphify update .`, semantic update 3 file, ghi exit code; chạy query
- Test tái hiện đề xuất: cmd_ST18_AC5_graphify | input: lệnh trên | mong đợi: update exit 0, query có nút rules/database.md
- Trạng thái: đã PASS (PASS ở lần 2)
- Lịch sử trạng thái (chỉ thêm): 2026-11-17 — lần 1 — FAIL — evidence/r1-E2E-AC-10-graphify.txt
- Lịch sử: 2026-11-17 — lần 2 — PASS — `evidence/ST-18/graphify-update.log` ghi `exit=0`; query của verifier trả nút `src=rules/database.md loc=L16`, nút `src=POS_API/README.md loc=L47-L54`, TECH_STACK.md có nút; `graphify-out/needs_update` không tồn tại — evidence/r2-graphify-query.txt, evidence/r2-needs-update.txt
- Ai sửa, file đã sửa, file errors: agent chính chạy `graphify update .` (không sửa mã)
