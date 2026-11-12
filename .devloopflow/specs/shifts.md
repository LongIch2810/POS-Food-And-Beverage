# Đặc tả ca làm việc và đối soát tiền mặt ban đầu

**Trạng thái:** Đã chốt ngày 02/11/2026 theo kế hoạch Sprint 5 ([plans/active/2026-11-03-sprint-05-shifts.md](../plans/active/2026-11-03-sprint-05-shifts.md)).

## Mục tiêu và phạm vi

- **Mục tiêu:** Cung cấp cơ chế quản lý ca làm việc cho nhân viên (`STAFF`) và thu ngân (`CASHIER`); kiểm soát tiền mặt đầu ca minh bạch, tự động kế thừa; đối soát đếm mù khi đóng ca; bảo đảm các bất biến về ca và khóa quỹ chi nhánh.
- **Trong phạm vi:**
  - Mô hình dữ liệu và migration: `work_shifts`, `cash_reconciliations`.
  - Phân quyền: `shift.read`, `shift.open`, `shift.close`, `shift.force_close`.
  - Ca nhân viên (`STAFF`): vào ca (`started_at`), tan ca (`ended_at`), tính số giờ làm (`ended_at - started_at`).
  - Ca thu ngân (`CASHIER`): mở ca, tính tiền đầu ca tự động (`opening_cash`), khởi tạo bản ghi đối soát trạng thái `PENDING`.
  - Đóng ca thu ngân cơ bản: đếm mù (`counted_cash`), tính chênh lệch `difference`, cập nhật trạng thái `MATCHED`/`SHORTAGE`/`OVERAGE` và chuyển ca sang `CLOSED`.
  - Đóng ca cưỡng chế (`force_close`): quản lý đóng ca bị quên, bắt buộc nhập tiền đếm thực tế và lý do.
  - Khóa quỹ: `PATCH /api/v1/branches/:id` chặn sửa `initialCash` sau khi chi nhánh đã phát sinh ca thu ngân đầu tiên.
  - Phân quyền, cô lập multi-tenant theo `store_id` và phạm vi chi nhánh (`branch_id`).
  - Lát cắt giao diện PB-13 (`ShiftsScreen`, `OpenShiftGate`, modals đếm mù / cưỡng chế).
- **Ngoài phạm vi:**
  - Gắn đơn bán hàng vào ca và kiểm tra ca mở khi tạo đơn: thuộc **PB-07**.
  - Ghi nhận chi phí két (`shift_expenses`): thuộc **PB-10**.
  - Đóng ca khi có đơn bán hàng và đối soát doanh thu tiền mặt được kéo vào Sprint 08 theo quyết định Product Owner ngày 09/11/2026: chặn khi còn đơn `OPEN`, cộng `payments.amount` phương thức CASH của hóa đơn PAID thuộc ca vào tiền kỳ vọng khi đóng thường hoặc cưỡng chế; không cộng tiền khách đưa, chuyển khoản hoặc hóa đơn 0đ. Chi từ két vẫn thuộc **PB-10**. Chi tiết và kiểm thử: `.devloopflow/approved/20261109-sprint08-payment.md`, mục R2-1.
- **Tài liệu và quy tắc liên quan:**
  - [PRODUCT_OVERVIEW.md](../docs/PRODUCT_OVERVIEW.md) mục 3, 4, 6.3.
  - [BUSINESS_RULES.md](../docs/BUSINESS_RULES.md): BR-14 đến BR-20, BR-55, BR-57 đến BR-61, BR-71, BR-76, BR-80, BR-81, BR-87, BR-88, BR-89, BR-102, BR-103.
  - [DESIGN_DB_POS_SYSTEM.md](../docs/DESIGN_DB_POS_SYSTEM.md) mục 5.
  - [api-spec.md](../docs/api-spec.md) quy ước chung HTTP, envelope lỗi và naming convention.

## Quyết định đã chốt

1. **Ranh giới ca trong Sprint 5:** Hỗ trợ đầy đủ vòng đời ca `OPEN` -> `CLOSED`. Với ca `CASHIER`, khi chưa có đơn hàng và chi phí, hệ thống tính `expected_cash = opening_cash`. Thu ngân đếm két nhập `counted_cash`, hệ thống tính `difference = counted_cash - expected_cash` và cập nhật đối soát. Ca thu ngân tiếp theo trong chi nhánh tự động lấy `counted_cash` này làm `opening_cash` (`BR-89`).
2. **Tiền đầu ca (BR-55, BR-102):** Thu ngân không gửi và không sửa `opening_cash`. Ca đầu lấy từ `branches.initial_cash`; các ca sau lấy từ `counted_cash` của ca `CASHIER` đã `CLOSED` gần nhất theo `ended_at` trong cùng chi nhánh.
3. **Mỗi người 1 ca mở (BR-14):** Thực thi bằng partial unique index `UNIQUE (user_id) WHERE status = 'OPEN'`. Cố mở thêm trả lỗi `409 SHIFT_ALREADY_OPEN`.
4. **Mỗi chi nhánh 1 ca thu ngân mở (BR-87):** Thực thi bằng partial unique index `UNIQUE (branch_id) WHERE status = 'OPEN' AND shift_type = 'CASHIER'`. Cố mở thêm trả lỗi `409 BRANCH_CASHIER_SHIFT_OPEN`.
5. **Khóa sửa quỹ chi nhánh:** `PATCH /api/v1/branches/:id` kiểm tra nếu chi nhánh đã có bất kỳ ca `CASHIER` nào thì từ chối sửa `initialCash` với lỗi `409 INITIAL_CASH_LOCKED`.
6. **Bắt buộc ghi chú khi lệch tiền (BR-60):** Khi đóng ca, nếu `difference !== 0` mà không có `note` (hoặc chuỗi rỗng), API trả lỗi `422 RECONCILIATION_NOTE_REQUIRED`.
7. **Phạm vi chi nhánh của người gọi (BR-71):** `CASHIER` và `MANAGER` mở ca tại chi nhánh gắn trên token; `OWNER` (có quyền `branch.access_all`) bắt buộc truyền `branchId` trong request body.
8. **Quyền truy cập:**
   - `shift.open`: `OWNER`, `MANAGER`, `CASHIER`.
   - `shift.close`: `OWNER`, `MANAGER`, `CASHIER` (chỉ đóng ca của chính mình).
   - `shift.force_close`: `OWNER`, `MANAGER`.
   - `shift.read`: `OWNER` (toàn store), `MANAGER` (trong branch), `CASHIER` (ca của chính mình).
   - `PLATFORM_ADMIN` tuyệt đối bị chặn `403 PERMISSION_DENIED` (`BR-81`).

## Luồng và hành vi

### 1. Luồng vào ca và tan ca nhân viên (`STAFF`)
1. Nhân viên gửi `POST /api/v1/work-shifts` với body `{ shiftType: 'STAFF' }`.
2. Hệ thống kiểm tra người dùng chưa có ca `OPEN` nào, tạo `work_shifts` với `shift_type = 'STAFF'`, `status = 'OPEN'`, `started_at = now()`.
3. Khi tan ca, nhân viên gửi `POST /api/v1/work-shifts/:id/close`.
4. Hệ thống cập nhật `ended_at = now()`, `status = 'CLOSED'`, `closed_by = user.id`. Kiểm tra ràng buộc `ended_at > started_at`.

### 2. Luồng mở ca thu ngân (`CASHIER`)
1. Thu ngân gửi `POST /api/v1/work-shifts` với body `{ shiftType: 'CASHIER', note?: string }`.
2. Hệ thống mở transaction, lấy khóa trên `branches` theo `branch_id`:
   - Kiểm tra chi nhánh đang active (`BR-76`).
   - Kiểm tra chi nhánh chưa có ca thu ngân `OPEN` nào (`BR-87`).
   - Kiểm tra người dùng chưa có ca `OPEN` nào (`BR-14`).
   - Tìm ca thu ngân `CASHIER` có `status = 'CLOSED'` gần nhất trong chi nhánh (`ORDER BY ended_at DESC`). Nếu có, lấy `counted_cash` của ca đó làm `opening_cash`; nếu không có, lấy `branches.initial_cash`.
3. Tạo dòng `work_shifts` (`shift_type = 'CASHIER'`, `status = 'OPEN'`, `started_at = now()`).
4. Tạo dòng `cash_reconciliations` (`work_shift_id = shift.id`, `opening_cash`, `status = 'PENDING'`).

### 3. Luồng đóng ca thu ngân (`CASHIER`)
1. Thu ngân gửi `POST /api/v1/work-shifts/:id/close` với body `{ countedCash: number, note?: string }`.
2. Hệ thống kiểm tra ca tồn tại, `status === 'OPEN'`, và thuộc quyền sở hữu của người gọi (`user_id === user.id`).
3. Tính `expected_cash = opening_cash + cash_sales_amount - expense_amount` (ở Sprint 5: `expected_cash = opening_cash`).
4. Tính `difference = counted_cash - expected_cash`.
5. Nếu `difference !== 0` và không có `note`, từ chối `422 RECONCILIATION_NOTE_REQUIRED`.
6. Cập nhật `cash_reconciliations`:
   - `cash_sales_amount = 0`, `expense_amount = 0`, `expected_cash = expected_cash`, `counted_cash = counted_cash`, `difference = difference`.
   - `status = difference === 0 ? 'MATCHED' : (difference < 0 ? 'SHORTAGE' : 'OVERAGE')`.
   - `reconciled_at = now()`, `note = note || null`.
7. Cập nhật `work_shifts`: `status = 'CLOSED'`, `ended_at = now()`, `closed_by = user.id`.

### 4. Luồng đóng cưỡng chế (`force-close`)
1. Quản lý gửi `POST /api/v1/work-shifts/:id/force-close` với body `{ countedCash: number, reason: string, note?: string }`.
2. Kiểm tra quyền `shift.force_close`, ca cùng branch/store, và ca đang `OPEN`.
3. Yêu cầu bắt buộc phải có `countedCash` (`BR-88`) và `reason`.
4. Tính toán đối soát tương tự như đóng ca, ghi `closed_by = manager.id`, lưu `reason` vào ghi chú của ca.

---

## Endpoint

### 1. `POST /api/v1/work-shifts` (Mở ca)
- **Mô tả:** Mở ca làm việc nhân viên hoặc ca thu ngân.
- **Quyền:** `shift.open` (`OWNER`, `MANAGER`, `CASHIER`).
- **Phạm vi:** Người có `branchId` trong token tự động gán vào chi nhánh đó. `OWNER` bắt buộc gửi `branchId` cùng store.
- **Business rule:** `BR-14`, `BR-15`, `BR-55`, `BR-71`, `BR-76`, `BR-87`, `BR-89`, `BR-102`.
- **Request Body:**
  ```json
  {
    "shiftType": "CASHIER", // hoặc "STAFF"
    "branchId": "uuid-optional-with-cashier-required-with-owner",
    "note": "Ghi chú ca làm (tùy chọn)"
  }
  ```
- **Response thành công:** `201 Created`
  ```json
  {
    "data": {
      "id": "uuid",
      "branchId": "uuid",
      "userId": "uuid",
      "shiftType": "CASHIER",
      "startedAt": "2026-11-03T01:00:00.000Z",
      "endedAt": null,
      "status": "OPEN",
      "closedBy": null,
      "note": null,
      "reconciliation": {
        "id": "uuid",
        "openingCash": 1000000,
        "status": "PENDING"
      },
      "createdAt": "2026-11-03T01:00:00.000Z",
      "updatedAt": "2026-11-03T01:00:00.000Z"
    }
  }
  ```
- **Lỗi:**
  | HTTP | Mã lỗi | Điều kiện |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | Thiếu `shiftType` hợp lệ hoặc dữ liệu không đúng định dạng |
  | 400 | `BRANCH_ID_REQUIRED` | Người gọi là OWNER nhưng không truyền `branchId` |
  | 403 | `PERMISSION_DENIED` | Người gọi không có quyền `shift.open` hoặc là PLATFORM_ADMIN |
  | 404 | `BRANCH_NOT_FOUND` | `branchId` không tồn tại hoặc không thuộc store |
  | 409 | `BRANCH_INACTIVE` | Chi nhánh đang ngưng hoạt động (`is_active = false`) |
  | 409 | `SHIFT_ALREADY_OPEN` | Người dùng này đã có một ca đang `OPEN` |
  | 409 | `BRANCH_CASHIER_SHIFT_OPEN` | Chi nhánh đã có một ca thu ngân đang `OPEN` |

---

### 2. `GET /api/v1/work-shifts/current` (Ca hiện tại của người gọi)
- **Mô tả:** Lấy thông tin ca đang `OPEN` của tài khoản hiện tại.
- **Quyền:** `shift.read` (`OWNER`, `MANAGER`, `CASHIER`).
- **Response thành công:** `200 OK`
  - Nếu có ca mở: trả về thông tin ca kèm `reconciliation` (nếu là `CASHIER`).
  - Nếu không có ca mở: `data: null`.

---

### 2b. `GET /api/v1/work-shifts/opening-cash-info` (Xem trước tiền đầu ca tự động)
- **Mô tả:** Xem trước số tiền đầu ca và nguồn tiền (`BR-55`, `BR-89`) cho chi nhánh trước khi mở ca thu ngân.
- **Quyền:** `shift.open` (`OWNER`, `MANAGER`, `CASHIER`).
- **Query params:** `branchId` (tùy chọn với `CASHIER`/`MANAGER` có branch trong session; bắt buộc với `OWNER` nếu muốn xem chi nhánh cụ thể).
- **Response thành công:** `200 OK`
  ```json
  {
    "data": {
      "amount": 1500000,
      "source": "BRANCH_INITIAL_CASH", // hoặc "PREVIOUS_SHIFT"
      "sourceText": "Lấy từ quỹ tiền ban đầu của chi nhánh (BR-55)" // hoặc "Kế thừa từ tiền thực đếm của ca thu ngân trước (BR-89)"
    }
  }
  ```

---

### 3. `GET /api/v1/work-shifts` (Danh sách ca)
- **Mô tả:** Xem danh sách ca làm việc có phân trang cursor.
- **Quyền:** `shift.read`.
- **Phạm vi:**
  - `CASHIER`: chỉ xem danh sách ca của chính mình (`user_id = user.id`).
  - `MANAGER`: chỉ xem ca thuộc chi nhánh của mình (`branch_id = user.branchId`).
  - `OWNER`: xem toàn bộ store hoặc lọc theo query `branchId`.
- **Query params:** `limit`, `cursor`, `branchId`, `status`, `shiftType`.
- **Response thành công:** `200 OK`
  ```json
  {
    "data": [...],
    "meta": { "limit": 20, "nextCursor": "...", "total": 45 }
  }
  ```

---

### 4. `GET /api/v1/work-shifts/:id` (Chi tiết ca)
- **Mô tả:** Xem thông tin chi tiết của một ca cụ thể kèm bản ghi đối soát.
- **Quyền:** `shift.read` (theo phạm vi tài khoản).
- **Lỗi:** `404 SHIFT_NOT_FOUND` nếu không tìm thấy hoặc ngoài phạm vi quyền.

---

### 5. `POST /api/v1/work-shifts/:id/close` (Đóng ca tự thân)
- **Mô tả:** Người làm ca tự đóng ca của mình khi hết giờ làm việc.
- **Quyền:** `shift.close`.
- **Request Body (bắt buộc với CASHIER, tùy chọn với STAFF):**
  ```json
  {
    "countedCash": 1000000, // bắt buộc với CASHIER (>= 0)
    "note": "Khớp tiền đầu ca"
  }
  ```
- **Response thành công:** `200 OK` (trả về ca `status = 'CLOSED'` và đối soát cập nhật).
- **Lỗi:**
  | HTTP | Mã lỗi | Điều kiện |
  | --- | --- | --- |
  | 400 | `COUNTED_CASH_REQUIRED` | Đóng ca CASHIER nhưng không nhập `countedCash` |
  | 403 | `FORBIDDEN_NOT_SHIFT_OWNER` | Cố đóng ca của người khác |
  | 404 | `SHIFT_NOT_FOUND` | Ca không tồn tại |
  | 409 | `SHIFT_CLOSED` | Ca đã đóng từ trước |
  | 422 | `RECONCILIATION_NOTE_REQUIRED` | Ca lệch (`difference !== 0`) mà thiếu `note` |

---

### 6. `POST /api/v1/work-shifts/:id/force-close` (Đóng ca cưỡng chế)
- **Mô tả:** Quản lý hoặc Chủ quán đóng cưỡng chế ca bị quên hoặc bất thường.
- **Quyền:** `shift.force_close` (`OWNER`, `MANAGER`).
- **Phạm vi:** Ca phải thuộc chi nhánh của Manager hoặc thuộc store của Owner.
- **Request Body:**
  ```json
  {
    "countedCash": 950000,
    "reason": "Thu ngân về quên đóng ca",
    "note": "Hụt 50k trong két"
  }
  ```
- **Response thành công:** `200 OK`

---

## Nghiệm thu và bằng chứng

1. **Test Tích Hợp API Backend (8 kịch bản trên PostgreSQL 17):**
   - SHIFT-01: Ca nhân viên STAFF vào ca và tan ca, `ended_at > started_at`. Mở 2 ca nhận `409 SHIFT_ALREADY_OPEN`.
   - SHIFT-02: Ca thu ngân CASHIER đầu tiên tự động lấy `initial_cash` của chi nhánh làm `opening_cash`, sinh `cash_reconciliations` PENDING.
   - SHIFT-03: Chi nhánh đã có ca thu ngân OPEN thì ca thứ 2 nhận `409 BRANCH_CASHIER_SHIFT_OPEN`.
   - SHIFT-04: Đóng ca CASHIER đếm khớp -> `MATCHED`; đếm lệch thiếu không note -> `422 RECONCILIATION_NOTE_REQUIRED`; có note -> `SHORTAGE`.
   - SHIFT-05: Mở ca CASHIER tiếp theo -> tự động lấy đúng `counted_cash` của ca trước.
   - SHIFT-06: `PATCH /branches/:id` sửa `initialCash` sau khi có ca CASHIER -> `409 INITIAL_CASH_LOCKED`.
   - SHIFT-07: Quản lý đóng cưỡng chế ca của thu ngân khác (`force_close`), lưu `closed_by` và `reason`.
   - SHIFT-08: Phân quyền & Cô lập dữ liệu: `PLATFORM_ADMIN` 403, cross-tenant 404/403, store SUSPENDED 403.
2. **Frontend UI Test:**
   - Unit test service `shiftService` gọi API HTTP thật qua client.
   - Component test hiển thị số tiền đầu ca read-only, form đóng ca đếm mù.
3. **E2E Browser Docker Evidence:**
   - Kịch bản chạy thật trên trình duyệt Chrome headless: Mở ca -> Xác nhận hiển thị -> Đóng ca đối soát -> Lưu screenshot vào `qa-evidence/`.

