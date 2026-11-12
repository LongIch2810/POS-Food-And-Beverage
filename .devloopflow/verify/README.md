# QA evidence trên Git

Repository chỉ theo dõi báo cáo và bản tóm tắt Markdown đã che dữ liệu nhạy cảm. Log runner, script/harness, ảnh, snapshot, request/response và dữ liệu DB gốc được giữ trong `qa-evidence/` của workspace local; `.gitignore` loại chúng khỏi các commit mới. Các đường dẫn đến artifact gốc trong báo cáo Markdown **không có đích trên remote**. Không coi riêng bản tóm tắt là xác nhận độc lập thay cho log/CI.

Ngày 12/11/2026, 3.468 file tại đây được chuyển và đối chiếu SHA-256 sang `.devloopflow/verify/<tên lần chạy gốc>/` (báo cáo) và `.devloopflow/verify/<tên lần chạy gốc>/evidence/` (raw, kèm `SHA256SUMS`). [Chỉ mục chứng cứ](EVIDENCE-INDEX.md) dẫn tới các thư mục này; việc chuyển không phải lần chạy QA mới.

- [Báo cáo QA Sprint 07](20261107-204250-5ada010f-s7-sprint-qa/run.md) và [bổ sung UI](20261107-204250-5ada010f-s7-sprint-qa/supplement/run.md): expected/actual và tên artifact gốc local.

Để kiểm chứng độc lập, chạy lại lệnh trong báo cáo trên môi trường test/sandbox an toàn hoặc đối chiếu một CI run gắn với commit tương ứng khi có. Không dùng tài khoản, dữ liệu hoặc database production cho các lệnh QA này.
