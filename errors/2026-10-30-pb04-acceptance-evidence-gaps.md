**Trạng thái:** đã sửa và QA đóng AUD-01..05 trong scope API/DB ngày30/10/2026; lịch sử thiếu chứng cứ giữ nguyên bên dưới.

# PB-04 — kết luận đủ chứng cứ vượt phạm vi đã kiểm tra

**Đối soát kết thúc 01/11/2026:** AUD-01..05 đã đóng; UI tổ chức và nghiệm thu local sau đó cũng hoàn tất tại [Sprint 3](../sprints/sprint-03/SPRINT.md#kết-luận-sprint-3--2026-11-01). Những câu “chưa có UI/chưa nghiệm thu” bên dưới giới hạn kết luận tại lượt API/DB30/10, không phải gap còn mở. Raw artifact và diễn biến audit được giữ nguyên.

## Kết quả sửa theo yêu cầu người dùng

- Run bản cuối: `qa-evidence/20261030-202325-9ce75dd-pb04-gap-fix/run.md`; QA `audit.md` đối chiếu từng AC/E/P/M/D, code reviewer `review.md` không còn finding.
- Bổ sung acceptance PostgreSQL thật: cùng-store crossbranch/current identity, multi-session reset,14 lịch khóa, SQL pagination/ties/filter/empty, actual app logger/commit barrier/rollback và DB snapshots. Sửa bảng lỗi/permission/ví dụ spec theo hợp đồng đã chốt.
- Phát hiện thêm hai lỗi runtime JOIN trước chờ lock (login401 sai; reset/disable404 sai), tái hiện red và sửa trong helper dùng chung; chi tiết `errors/2026-10-30-pb04-login-role-lock-race.md`.
- Full-2 npm test exit0,48/48 TAP nodes (13 top-level+35 nested), CLI migration first/repeat exit0; manifests source66/runtime64/contract9 và7 raw/gzip SHA256 được QA đọc/rehash khớp.
- Kết luận giới hạn: không còn gap trọng yếu mở trong AUD-01..05 đã sửa. Bằng chứng local do agent chạy, QA đọc lại; chưa có CI, UI/PB-13, quỹ sau ca/PB-06 hay production. Chưa nghiệm thu Sprint3.

## Ghi nhận tại thời điểm audit đầu (lịch sử)

- Task: `tasks/completed/2026-10-30-pb04-organization-api.md`; plan: `plans/completed/2026-10-30-pb04-organization-api.md`.
- Bản đối chứng: `qa-evidence/20261030-200921-9ce75dd-pb04-evidence-audit/audit.md`, subagent QA `/root/pb04_evidence_audit`, root đọc lại/đối chiếu source và báo cáo gốc.
- Phiên bản: feat/pb04-organization-api, base/HEAD9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18, working tree dirty. Source64/config và runtime62 khớp manifest; không có dấu hiệu lệch source so bộ log local đã lưu.
- Triệu chứng: original review.md:25 và run.md:41 nói không thiếu chứng cứ trong scope, nhưng assertion/artifact không bao phủ mọi vế spec API/DB. 21/21 là tổng TAP node thực (11 top-level,10 nested), không phải bằng chứng mọi tiêu chí đạt.
- Nguyên nhân xác minh: review trước kiểm file/hash và đọc code, chưa đối chiếu đủ từng vế với fixture, assertion và artifact gốc. Không coi việc source có guard/transaction hoặc log file tồn tại là đã kiểm chứng hành vi tương ứng.

## Các phần cần kiểm chứng/bổ sung

1. AUD-01: tài nguyên cùng store/khác branch; user/store bị khóa gọi trực tiếp endpoint tổ chức; quyền/branch thay đổi sau login và DB không đổi khi bị từ chối. ORG-03 hiện dùng bàn store khác, không đủ riêng BR-71 cùng tenant.
2. AUD-02: reset user active có nhiều phiên sống; reset cạnh tranh login/refresh, reset lặp, đăng nhập bằng mật khẩu cũ và refresh mỗi thiết bị. USR-04 hiện chỉ race role-change/refresh và disable/login; USR-02 reset sau khi phiên đã bị thu hồi bởi bước khác. Snapshot diagnostic USR-03 trước reset rollback không được mô tả thành sau reset rollback.
3. AUD-03: fixture DB cùng millisecond/khác microsecond và timestamp bằng nhau; duyệt hết trang/exact ID set/order/nextCursor; branch/table/staff filters, empty lists và scope cursor qua HTTP. ORG-PAGE hiện chỉ unit decoder, ORG-04 mới so hai trang branch.
4. AUD-04: log app thật sau commit/không log khi rollback, không secret; thêm DB trước/sau đủ các mutation/denial. Suite hiện logger:false; HTTP metadata an toàn không thay chứng cứ application log.
5. AUD-05: sửa câu quyền PATCH users gây hiểu nhầm platform có route này, bảng lỗi dùng chung không đúng endpoint và ví dụ thiếu body/response. Đây là sai lệch tài liệu, không phải cần triển khai platform PATCH.

## Hướng xử lý và kiểm chứng tiếp

- Lượt audit chỉ báo cáo, không sửa code/test/spec hoặc chạy mới. Đã thêm đính chính vào hồ sơ cũ, giữ nguyên raw logs.
- Trước nghiệm thu, bổ sung tình huống/assertion/artifact theo ma trận audit; lập ma trận trước khi chạy, dùng DB QA cô lập, lưu output gốc, metadata và đối chiếu source/runtime cuối theo AGENTS.md. QA rà lại từng vế.
- Chưa đóng QA toàn PB-04 hoặc nghiệm thu Sprint3. UI PB-13 và quỹ sau ca PB-06 vẫn ngoài phần triển khai API/DB đã chốt, không ghi thành bug PB-04.
