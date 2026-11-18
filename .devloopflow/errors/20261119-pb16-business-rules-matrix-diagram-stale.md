---
id: 20261119-pb16-business-rules-matrix-diagram-stale
tags: [docs, invoices, permissions, state]
found_by: ac-verifier
severity: chưa xác định
occurrences: 1
tasks: [20261119-sprint11-pb16-recheck]
---

# V1-1 — Ma trận quyền và sơ đồ hóa đơn chưa khớp BR-110

## Triệu chứng
- S11-02 FAIL, loại Lệch tài liệu: `docs/BUSINESS_RULES.md:230` còn ghi OWNER và MANAGER được hủy đơn đã thanh toán; sơ đồ tại `:249-251` còn vẽ PAID → CANCELLED, trái BR-110.
- Bằng chứng trước sửa: `.devloopflow/verify/20261119-sprint11-pb16-recheck/evidence/r1-S11-02-document-quotes.log` và `r1-S11-01-curl-db.json` (hủy PAID trả 409).

## Nguyên nhân gốc
- Khi cập nhật tài liệu cho PB-16, nhãn bảng và chú thích sơ đồ đã đổi nhưng giá trị quyền và đường nối cũ vẫn còn.

## Cách fix
- File và thay đổi: `docs/BUSINESS_RULES.md` — đổi hai giá trị quyền thành Không và bỏ đường nối PAID → CANCELLED, giữ đường OPEN → CANCELLED.
- Test tái hiện: không áp dụng vì chỉ sửa tài liệu; đối chiếu trực tiếp bảng, sơ đồ và BR-110 bằng `rg -n 'BR-110|ma trận quyền|sơ đồ|tài liệu.*(quyền|hủy)' .devloopflow/errors/INDEX.md docs/BUSINESS_RULES.md`; kết quả bảng cả bốn vai trò Không, sơ đồ ghi PAID không hủy được.
- Nghiệm thu lại: chưa kiểm tại thời điểm ghi hồ sơ; chỉ verifier xác nhận PASS.

## Quy tắc phòng tránh
- Khi bỏ một chuyển trạng thái hoặc quyền, kiểm cả giá trị trong ma trận và các cạnh sơ đồ, không chỉ chú thích.

## Dấu hiệu nhận biết khi review
- Nhãn nói đã bãi bỏ nhưng cột quyền vẫn Có; chú thích nói không hủy được nhưng sơ đồ vẫn có cạnh hủy.
