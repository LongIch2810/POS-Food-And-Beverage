# Sổ FAIL của task 20261119-sprint11-pb16-recheck

- Task: 20261119-sprint11-pb16-recheck.
- Cập nhật lần cuối: 2026-11-19, sau lần verify-ac thứ 2.
- Phạm vi: chỉ hai AC cấp sprint S11-01 và S11-02.
- Phạm vi lần 2: chỉ kiểm lại S11-02 / V1-1; S11-01 không kiểm lại.
- Điều kiện hoàn tất phạm vi kiểm: không còn mục trạng thái `mở` và kết quả mới nhất của cả S11-01/S11-02 là PASS.
- Không dùng sổ này để kết luận hoàn thành toàn Sprint 11 hoặc toàn plan PB-16.

## Tổng hợp

| Id | AC | Loại | Trạng thái | Phát hiện ở lần | PASS ở lần | Report | Bằng chứng |
|---|---|---|---|---|---|---|---|
| V1-1 | S11-02 | Lệch tài liệu | đã PASS | 1 | 2 | report-1.md; report-2.md | evidence/r1-S11-02-document-quotes.log; evidence/r1-S11-02-doc-diff.log; evidence/r1-S11-01-curl-db.json; evidence/r2-S11-02-numbered-source-excerpts.log; evidence/r2-S11-02-doc-diff.log; evidence/r2-S11-02-focused-results.log; evidence/r2-S11-02-live-permissions.json |

- S11-01: PASS trong lần 1; không phát hiện FAIL trong các vế API, UI, OPEN và legacy CANCELLED đã kiểm. Không kiểm lại ở lần 2.
- S11-02, lịch sử lần 1: mã/permission/test/build đã đạt; phần BR chưa khớp mã nên toàn AC FAIL.
- S11-02, kết quả mới nhất lần 2: PASS. Ma trận quyền và sơ đồ BR đã khớp BR-110, API spec, README và mã. Mã/permission/test/build được kiểm mới bằng artifact r2.
- Không còn mục trạng thái `mở`.
- Loại: Sai | Spec | Lệch tài liệu | Không có chứng cứ | Môi trường | errors/ thiếu.
- Trạng thái: `mở` | `đã PASS` | `huỷ do đổi plan/spec`.

## Chi tiết từng FAIL

### V1-1 — S11-02

- Phát hiện ở lần: 1.
- Report: `.devloopflow/verify/20261119-sprint11-pb16-recheck/report-1.md`.
- Report kiểm lại: `.devloopflow/verify/20261119-sprint11-pb16-recheck/report-2.md`.
- Loại: Lệch tài liệu.
- Kỳ vọng theo sprint (nguyên văn):
  - “Endpoint, mã lỗi, permission và test của hủy đơn `PAID` đã gỡ; `docs/api-spec.md`, BR và README khớp mã.”
- Tài liệu nguồn:
  - `docs/BUSINESS_RULES.md:308`: “**Bãi bỏ hủy đơn `PAID`.** Chỉ đơn `OPEN` hủy được.”
  - `docs/api-spec.md:354`: “Hủy đơn `PAID`: đơn đã thanh toán bất biến, "Đơn đã thanh toán không thể hủy."”
  - Spec PB-16: “Không còn cách nào, qua API hay UI, để hủy một đơn đã thanh toán; gọi API hủy đơn `PAID` trả lỗi rõ ràng.”
- Thực tế:
  - `docs/BUSINESS_RULES.md:230` vẫn ghi:
    `| Hủy đơn đã thanh toán (đã bãi bỏ ở PB-16, BR-110) | Không | Có | Có | Không |`
    Hai giá trị “Có” thuộc OWNER và MANAGER.
  - `docs/BUSINESS_RULES.md:249-251` vẫn vẽ đường PAID→CANCELLED:
    `Hóa đơn: OPEN ── thanh toán đủ ──▶ PAID`
    và `└── hủy ──▶ CANCELLED ◀───┘`.
  - Chú thích nói PAID không hủy được nhưng cạnh và bảng quyền vẫn thể hiện ngược lại.
  - HTTP thực tế bằng OWNER từ chối hủy PAID bằng 409 INVOICE_PAID_IMMUTABLE; DB trước/sau không đổi.
- Bước tái hiện:
  1. Mở bảng quyền `docs/BUSINESS_RULES.md:230`; đọc cột OWNER/MANAGER.
  2. Mở sơ đồ vòng đời tại `:249-251`; theo cạnh từ PAID sang CANCELLED.
  3. Đối chiếu BR-110 tại `:308` và lỗi API đã ghi tại `docs/api-spec.md:354`.
  4. Xem HTTP/SQL đã chạy tại `evidence/r1-S11-01-curl-db.json`.
- Bằng chứng:
  - `evidence/r1-S11-02-document-quotes.log`
  - `evidence/r1-S11-02-doc-diff.log`
  - `evidence/r1-S11-01-curl-db.json`
- Test tái hiện đề xuất:
  - Tên: `S11-02 BR permission matrix and lifecycle agree with BR-110`.
  - Input: bảng quyền/sơ đồ BR hiện hành; OWNER/MANAGER gọi hủy đơn PAID thật.
  - Kết quả mong đợi: không vai trò nào được tài liệu cấp quyền hủy PAID; không có cạnh PAID→CANCELLED; HTTP vẫn 409 INVOICE_PAID_IMMUTABLE.
  - Phương thức: đối chiếu tài liệu trực tiếp kết hợp HTTP; không cần test tự động chỉ so chuỗi Markdown.
- Trạng thái: đã PASS.
- Lịch sử trạng thái:
  - 2026-11-19 — lần 1 — FAIL — `evidence/r1-S11-02-document-quotes.log`, `evidence/r1-S11-01-curl-db.json`.
  - 2026-11-19 — lần 2 — PASS — `evidence/r2-S11-02-numbered-source-excerpts.log`, `evidence/r2-S11-02-doc-diff.log`, `evidence/r2-S11-02-code-test-check.log`, `evidence/r2-S11-02-focused-results.log`, `evidence/r2-S11-02-live-permissions.json`.
- Ai sửa, file đã sửa, file `.devloopflow/errors/`: agent chính sửa `docs/BUSINESS_RULES.md` theo lựa chọn của user; `.devloopflow/errors/20261119-pb16-business-rules-matrix-diagram-stale.md`. Trạng thái vẫn mở chờ kiểm lại.
- Kết quả kiểm lại lần 2:
  - Phần “Thực tế”, “Bước tái hiện” và dòng “Ai sửa” phía trên được giữ nguyên như ghi nhận trước kiểm lại.
  - Ma trận tại `docs/BUSINESS_RULES.md:230` hiện có bốn giá trị Không, gồm OWNER và MANAGER.
  - Sơ đồ tại `docs/BUSINESS_RULES.md:249-252` hiện chỉ có OPEN→PAID và OPEN→CANCELLED, không còn cạnh PAID→CANCELLED.
  - API spec, BR-110, README và source cùng quy định PAID bất biến.
  - Hai lệnh `rg` tìm quyền/mã lỗi cũ trong phạm vi đã duyệt không có kết quả, exit 1.
  - Test nguồn hủy PAID cũ và các artifact dist tương ứng không còn tồn tại.
  - App sandbox mới: SQL chỉ còn `invoice.cancel_open`; curl `/auth/me` OWNER/MANAGER trả 200, quyền hủy chỉ còn `invoice.cancel_open`.
  - API build/test mới: 347/347 PASS, fail 0, exit 0. UI typecheck/build exit 0; UI test 231/231 PASS; browser router 9/9 PASS.
  - Source hash kiểm lại không đổi. App đã dừng; sandbox riêng của lượt kiểm đã dọn.
  - Không dùng chứng cứ lần 1 làm kết quả mới; artifact mới nằm trong `evidence/r2-*`.
  - V1-1 đủ điều kiện chuyển `đã PASS`.
