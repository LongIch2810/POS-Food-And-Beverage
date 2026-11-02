# Bằng chứng Sprint 03 được publish — 02/11/2026

Sprint 3 đã được Product Owner nghiệm thu local ngày01/11/2026. Các báo cáo `run.md`, `audit.md`, `review.md` và `acceptance-readiness.md` giữ nguyên trạng thái tại thời điểm thực thi/rà soát, bao gồm các câu chờ PO hoặc chưa commit. Quyết định sau cùng ở [Sprint 3](../sprints/sprint-03/SPRINT.md#kết-luận-sprint-3--2026-11-01).

| Nhóm bằng chứng | Vai trò |
| --- | --- |
| [PB-04 ban đầu](20261030-193116-9ce75dd-pb04/run.md) | Lịch sử triển khai và regression đầu; kết luận đủ chứng cứ đã được đính chính sau audit |
| [Audit PB-04](20261030-200921-9ce75dd-pb04-evidence-audit/audit.md) | Phát hiện AUD-01..05 |
| [Sửa gap PB-04](20261030-202325-9ce75dd-pb04-gap-fix/run.md) | Bổ sung chứng cứ/sửa lỗi, full API48/48 và QA đóng gap |
| [UI tổ chức](20261030-214100-9ce75dd-pb13-organization-ui/run.md) | Regression/browser lịch sử và replay sau sửa; phân biệt các phiên bản UI theo run |
| [Kiểm chứng cuối](20261101-203100-9ce75dd-pb13-final/run.md) | UI28/28, API rerun48/48, typecheck/build/browser local, manifests và QA readiness |

Trước commit ngày02/11, đã đọc và so SHA-256 đủ221 mục source/runtime/contract/tooling và500 mục artifact của bộ cuối: đều khớp. Việc này kiểm tính toàn vẹn, không chạy lại test hoặc chứng minh CI độc lập. API commit `77462ed`, UI commit `8de87c1`; base `9ce75dd` trong báo cáo là base của working tree lúc kiểm thử, không phải commit đã chứa tính năng.

Git giữ nguyên byte của năm thư mục QA qua `.gitattributes`. Log API lịch sử23MB được nén lossless, raw local vẫn giữ nguyên; xem [hướng dẫn khôi phục và checksum](20261030-214100-9ce75dd-pb13-organization-ui/PUBLICATION.md) trước khi kiểm artifact manifest sau clone. Source manifests mô tả byte của working tree Windows lúc chạy; checkout có thể đổi CRLF/LF theo cấu hình Git, và runtime build không được đưa vào Git. Không sửa manifest lịch sử để khớp một checkout hoặc môi trường mới.

Không publish credential fixture nằm ngoài repository, token, password hash hoặc build/dependency. Đã quét text/JSON và gzip cho mẫu JWT/private key/bcrypt và trường credential chưa che trước stage; không phát hiện trong nhóm artifact publish. Ảnh được QA kiểm từ lượt nghiệm thu trước, không chụp hoặc chạy lại browser trong lượt đóng gói.
