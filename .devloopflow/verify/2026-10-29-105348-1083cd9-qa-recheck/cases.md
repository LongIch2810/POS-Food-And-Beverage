# Đối chiếu tình huống PB-02

Các tình huống dưới đây nằm trong một test runner `PB-02 login creates a hashed refresh session and cookie-only tokens` thành công trong [test.log](evidence/test.log). Điều kiện, thao tác và thực tế là các assertion trong source, không phải kiểm thử thủ công hay chạy từng tình huống độc lập.

| ID / quy tắc | Điều kiện và thao tác | Mong đợi | Thực tế theo assertion được chạy |
| --- | --- | --- | --- |
| QA-R01 / BR-03, BR-04 | Cùng user đăng nhập hai phiên A, B; logout A; dùng access và refresh của từng phiên. | A bị thu hồi; B còn sử dụng được. | Logout A 204; `/me` và refresh A 401; `/me` và refresh B 200. `auth.integration.test.ts:349–374`. |
| QA-R02 / BR-03, BR-04 | Phiên B còn sống; trigger PostgreSQL gây lỗi khi thêm refresh token mới; thử refresh rồi bỏ trigger, dùng lại refresh cũ. | Xoay token thất bại và transaction rollback; phiên cũ vẫn hoạt động. | Refresh lỗi 500, `/me` 200; sau khi bỏ trigger refresh cũ 200. `auth.integration.test.ts:380–398`. |
| QA-R03 / BR-01, BR-03 | Phiên C sống, biết mật khẩu hiện tại; trigger gây lỗi cập nhật refresh token khi đổi mật khẩu. | Mật khẩu và phiên cũ giữ nguyên sau rollback. | Đổi mật khẩu trả 500; hash vẫn khớp mật khẩu cũ; `/me` phiên C 200. `auth.integration.test.ts:400–418`. |
| QA-R04 / BR-01, BR-03 | Cùng user có phiên B và C; C đổi mật khẩu tự nguyện với mật khẩu hiện tại đúng. | Thành công, lưu hash mới và thu hồi các phiên. | 204 với ba cookie; hash khớp mật khẩu mới; `/me` B/C 401 và refresh mới nhất của B 401. `auth.integration.test.ts:420–432`. |

Giới hạn: mọi tình huống gộp và phụ thuộc trình tự trong cùng test runner, tên test runner không mô tả từng hành vi; output không tách kết quả riêng. Cookie được gắn thủ công qua HTTP; chưa kiểm chứng browser HTTPS, `Secure`, `SameSite` và hành vi gửi cookie thực tế. Không có CI độc lập trong bằng chứng này. Không kết luận về luồng POS hoặc các endpoint ngoài auth.
