# Đối chiếu tình huống test tự động PB-02

Lần chạy: [run.md](run.md); output gốc: [test.log](evidence/test.log). Kết quả sau đây là các assertion nằm trong test tích hợp `POS_API/src/auth/tests/auth.integration.test.ts`, test cấp runner tương ứng đã hoàn tất thành công; không phải kiểm tra thủ công độc lập.

| ID | Điều kiện và thao tác | Mong đợi | Thực tế |
| --- | --- | --- | --- |
| QA-AUTH-01 | User hoạt động, login có Origin và mật khẩu đúng | HTTP 200; ba cookie; chỉ lưu hash refresh | Các assertion dòng 73–87 đạt (BR-01, BR-04). |
| QA-AUTH-02 | Đăng nhập, sau đó khóa user hoặc suspend store và gọi `/me` | User khóa trả 403 ACCOUNT_DISABLED; store khóa trả 403 STORE_SUSPENDED; login store khóa bị từ chối | Assertion dòng 108–132 đạt (BR-02, BR-82). |
| QA-AUTH-03 | Có phiên; refresh rồi replay token cũ | Refresh 200, token cũ bị thu hồi; replay 401 và xóa cookie | Assertion dòng 155–171 đạt (BR-03, BR-04). |
| QA-AUTH-04 | Phiên cần đổi mật khẩu; gửi CSRF sai rồi đổi mật khẩu đúng | CSRF sai 403; đổi mật khẩu 204, hash đổi, access cũ bị từ chối | Assertion dòng 247–261 đạt (BR-01, BR-03, BR-84). |
| QA-AUTH-05 | Đã đổi mật khẩu lần đầu; nhập currentPassword sai | 401 CURRENT_PASSWORD_INVALID; phiên vẫn dùng được | Assertion dòng 311–317 đạt (BR-03). |
| QA-AUTH-06 | Thay đổi permission trong DB khi access token còn hiệu lực | Quyền mới được kiểm tra theo DB hiện hành | Assertion dòng 306–310 đạt (BR-05). |
| QA-AUTH-07 | Đăng nhập thất bại và gửi refresh vượt ngưỡng | Login và refresh bị giới hạn 429; login có Retry-After | Assertion dòng 318–347 đạt. |
| QA-AUTH-08 | Hai refresh đồng thời cùng phiên | Một request 200, một request 401, phiên bị thu hồi sau replay | Assertion dòng 184–198 đạt (BR-03, BR-04). |

Giới hạn: test gộp nhiều assertion vào một test cấp runner; không chứng minh độc lập các tiêu chí không có assertion như đổi mật khẩu tự nguyện thành công và thu hồi mọi phiên khác, logout chỉ ảnh hưởng đúng một trong hai phiên, rollback chủ động hoặc chạy browser HTTPS thật. Chưa thử API nghiệp vụ chéo cửa hàng/chi nhánh vì PB-02 chỉ cung cấp auth.
