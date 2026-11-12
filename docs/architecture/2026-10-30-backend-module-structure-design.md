# Thiết kế tổ chức module backend REST API

> Trạng thái: Đã được người dùng cho triển khai ngày 2026-10-30 theo phương án module nghiệp vụ gọn; kết quả kiểm chứng được ghi trong task và run QA tương ứng.

## Mục tiêu và phạm vi

Chuẩn hóa auth và platform thành hai module mẫu cho các module REST API sau này. Giữ NestJS modular monolith, TypeORM và PostgreSQL hiện có. Thay đổi vị trí mã và phụ thuộc cần thiết; giữ nguyên URL, method, permission, validation, response, cookie, transaction và schema DB.

## Phương án đã chọn

- Module nghiệp vụ gọn: người dùng chọn phương án 1. Module/service tại gốc module; HTTP, entity và test được nhóm theo trách nhiệm. Phù hợp mã auth hiện tại và ít lớp trung gian.
- Clean Architecture nhiều lớp: tách application/domain/infrastructure; không chọn vì tăng phạm vi và số lớp cho backend hiện tại.

## Cấu trúc đích

```text
POS_API/src/
  main.ts
  app.module.ts
  bootstrap-admin.ts
  swagger-docs.ts
  foundation.test.ts
  http/
    api-response.ts
    api-error.filter.ts
    http-error.ts
    health.controller.ts
  database/
    database.module.ts
    data-source.ts
    migrations/
    entities/                    # Branch: chưa có module Organization triển khai
  auth/
    auth.module.ts
    auth.service.ts
    auth-config.ts
    http/                        # controller, DTO, cookie
    security/                    # guard, Passport strategy
    entities/                    # User, Role, Permission, RolePermission,
                                 # RefreshToken, AuthRateEvent
    tests/
  platform/
    platform.module.ts
    platform.service.ts
    platform.pagination.ts
    http/
      platform.controller.ts
      platform.dto.ts
    entities/
      store.entity.ts
    tests/
      platform.integration.test.ts
      platform.pagination.test.ts
```

Các vị trí chi tiết trong cây là đề xuất của agent dựa trên phương án đã chọn, cần duyệt cùng thiết kế này. Không tạo thư mục rỗng. Không tạo module Organization chỉ để chứa Branch; entity này chuyển về module sở hữu khi chức năng đó được triển khai.

## Trách nhiệm và chiều phụ thuộc

- AppModule lắp ghép module; main giữ khởi động. HTTP toàn ứng dụng nằm trong src/http, HTTP riêng nghiệp vụ nằm trong <module>/http. Không tạo thêm common/ hoặc shared/ chứa mã không rõ chủ sở hữu.
- Controller xử lý request/response và gọi service. DTO/validation request ở http/; không bắt buộc một file cho từng DTO. Service giữ nghiệp vụ và ranh giới transaction, không nhận đối tượng Express Request/Response.
- Giữ platform.pagination.ts tại gốc platform vì controller và service cùng dùng logic phân trang. Không trích thành framework phân trang dùng chung khi chưa có module thứ hai cần cùng hợp đồng.
- Entity thuộc module sở hữu; DataSource đăng ký tập entity tường minh và migration vẫn tập trung trong database/. Quan hệ entity liên module được phép, dùng import trực tiếp và callback TypeORM; tránh barrel gây vòng phụ thuộc. Không đổi tên bảng, cột, relation hay migration lịch sử.
- Auth sở hữu danh tính, quyền và phiên. Platform sở hữu Store và điều phối cấp OWNER/khóa store bằng transaction hiện có. Không viết lại các luồng này hoặc tạo users module trong lần refactor này.
- Helper tạo lỗi HTTP hiện có ở auth.service được đưa về src/http/http-error.ts để platform không phải phụ thuộc service auth cho lỗi validation chung. Giữ nguyên status và payload lỗi; cập nhật toàn bộ caller và test liên quan.
- Guard/strategy vẫn ở auth/security; PlatformModule dùng AuthModule qua các provider được export. Không truy cập controller của module khác. Không thêm repository wrapper, base service/controller, CQRS, event bus hay dependency.
- Module tương lai theo <module>.module.ts, <module>.service.ts, http/, entities/, tests/; security/ chỉ khi có mã bảo mật riêng. Khi service lớn lên, tách theo trách nhiệm đã xuất hiện thay vì dựng trước các tầng.

## File và nơi phải cập nhật

Auth/platform, import entity trong relation/đăng ký DataSource/bootstrap/test, AppModule và import filter/health, các caller của helper lỗi. Cập nhật ARCHITECTURE.md mục hiện trạng và 5.1, POS_API/README.md để mô tả quy ước và trạng thái thực tế. Không đổi hợp đồng endpoint trong .devloopflow/specs/ hoặc thêm công nghệ vào TECH_STACK.md.

## Kiểm chứng và rủi ro

- Lập bảng tiêu chí → kiểm tra → artifact trước khi chạy. Lưu lệnh, SHA, trạng thái dirty, môi trường, thời gian, exit code và stdout/stderr gốc trong qa-evidence/; gắn nhãn local do agent chạy.
- Build TypeScript phải thành công sau cập nhật import. Chạy bộ test backend hiện có trên PostgreSQL thử riêng, gồm foundation/migration, auth và platform; không chấp nhận test integration bị bỏ qua làm bằng chứng đạt.
- Đối chiếu entity metadata/đăng ký và migration để bảo đảm di chuyển không làm thiếu entity, tạo class trùng hoặc thay schema. Chỉ thêm kiểm tra nhỏ nếu test hiện có chưa bảo vệ điểm này.
- Di chuyển source có thể để JS cũ trong dist vì tsc không tự xóa file cũ. Kiểm tra danh sách artifact build cũ và xử lý đúng phạm vi theo quy tắc bảo vệ source trước khi chạy test, tránh chạy trùng test hoặc nạp module cũ.
- Không chạy browser vì không đổi UI; kiểm tra HTTP backend qua bộ test hiện có. Không tuyên bố CI độc lập nếu chỉ chạy local. Không push hoặc merge.

## Điều kiện hoàn thành

Auth/platform theo cấu trúc đã duyệt; caller/import/đăng ký entity đồng bộ; build và test backend có bằng chứng; tài liệu hướng dẫn module mới khớp mã; task/plan ghi kết quả và phần chưa xác minh. Đưa diff ra review trước khi merge.
