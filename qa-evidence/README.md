# QA evidence trên Git

Repository chỉ theo dõi báo cáo và bản tóm tắt Markdown đã che dữ liệu nhạy cảm. Log runner, script/harness, ảnh, snapshot, request/response và dữ liệu DB gốc được giữ trong `qa-evidence/` của workspace local; `.gitignore` loại chúng khỏi các commit mới. Các đường dẫn đến artifact gốc trong báo cáo Markdown **không có đích trên remote**. Không coi riêng bản tóm tắt là xác nhận độc lập thay cho log/CI.

- [Tóm tắt QA Sprint 07](SPRINT-07-SUMMARY.md): AC-1..7 và S7-01..07, lệnh kiểm tra, giới hạn nghiệm thu.
- [Báo cáo QA Sprint 07](20261107-204250-5ada010f-s7-sprint-qa/run.md) và [bổ sung UI](20261107-204250-5ada010f-s7-sprint-qa/supplement/run.md): expected/actual và tên artifact gốc local.

Để kiểm chứng độc lập, chạy lại lệnh trong báo cáo trên môi trường test/sandbox an toàn hoặc đối chiếu một CI run gắn với commit tương ứng khi có. Không dùng tài khoản, dữ liệu hoặc database production cho các lệnh QA này.
