---
id: 20261114-icon-tooltip-ui
title: Chuẩn hóa nút biểu tượng và tooltip trong quản lý thực đơn
status: completed
created_at: 2026-11-14
approved_at: 2026-11-14
---

# Chuẩn hóa nút biểu tượng và tooltip trong quản lý thực đơn

## Mục tiêu và bối cảnh
- Yêu cầu nguyên văn trong task: “trong bảng các thao tác hay sidebar hay các nút thao tác khi  hiển thị icon + tooltip thay vì chữ nó bị xấu và phình to sửa lại”. User chọn “Giữ icon, làm tooltip và nút gọn đẹp hơn”, sau đó nói “duyệt” cho spec.
- Spec nguồn: `.devloopflow/specs/20261114-icon-tooltip-ui.md:1-76`, trạng thái approved. Plan này chỉ xác định cách triển khai; chưa được duyệt và chưa có AC nào PASS.
- Người dùng: chủ quán và người được quản lý thực đơn, trên desktop và tablet; giữ nguyên điều kiện quyền hiện có tại `POS_UI/src/features/products/ProductsScreen.tsx:36-40,662-677`.
- Kết quả: giữ icon tại các nút đã chỉ có icon, thống nhất phần nhìn và tooltip; vùng thao tác vẫn tối thiểu 48×48px, khoảng cách tối thiểu 8px. “Gọn” không đồng nghĩa giảm mục tiêu chạm xuống dưới chuẩn `DESIGN.md:33,133-145`.

## Khám phá
- `Button` dùng `.btn`, `.btn-sm`, render children trong `<span>`; `.btn` có `gap:8px`, padding ngang20, `.btn-sm` có min-height40 và padding14 — `POS_UI/src/components/ui/Button.tsx:18-65`, `POS_UI/src/styles/ui.css:15-34,258`. Không suy rằng toàn bộ sự phình user thấy do một selector này.
- Đã chạy `graphify query 'Button AppShell ProductsScreen icon button tooltip title sidebar' --budget 1600`, sau khi kiểm `graphify-out/needs_update` không tồn tại. Graph định vị `ProductsScreen`, `Button`, `AppShell`; nội dung được đối chiếu source. Không dùng graph làm bằng chứng giao diện.
- `.icon-btn` hiện có diện tích 48×48px và nền trong suốt; tái sử dụng lớp này — `POS_UI/src/styles/components.css:13-37`.
- Bảng dùng `.table-wrap`; `DataTable` chỉ xử lý phím Enter/Space của chính hàng, bỏ qua sự kiện từ phần tử con — `POS_UI/src/components/ui/DataTable.tsx:24-85`.
- `disabledReason` của `Button` đang được caller `InvoiceDetailDrawer` sử dụng, với dòng lý do nhìn thấy — `POS_UI/src/components/ui/Button.tsx:34-62`, `POS_UI/src/features/invoices/InvoiceDetailDrawer.tsx:202`. Không thay hợp đồng hoặc dòng lý do này.
- UI test dùng `node:test`; đã có `puppeteer-core` và browser regression dùng esbuild có sẵn trong cây dependency. Không thêm dependency — `POS_UI/package.json:6-29`, `POS_UI/test/shift-close-accessibility.browser.mjs:1-49`.

### Bảng vị trí cụ thể trước triển khai

Đã quan sát browser thật bằng Chrome DevTools: component `AppShell` + `ProductsScreen`, CSS nguyên bản; esbuild bundle trong bộ nhớ, mock đúng biên `AuthContext`, `ToastContext`, `menuService`, `shiftService`. Dữ liệu minh họa: owner QA, 2 món Cà phê sữa đá/đen đá (29.000đ/25.000đ), 1 size M, 1 topping Thêm sữa đặc. Callback `showToast` của fixture được giữ ổn định để không tạo vòng tải lại. Không gọi API/DB, không kiểm tích hợp thật và không kết luận dữ liệu sandbox thật có những món này.

| Vị trí | Nguồn/caller | Bằng chứng đã quan sát | Quyết định phạm vi |
|---|---|---|---|
| Thực đơn → Món & Giá bán → Sửa thông tin, Ngưng bán/Mở bán lại, Xóa món | `ProductsScreen.tsx:953-979` | PNG/DOM cả3 viewport: nút27×40px trên Puppeteer Chrome, glyph13px, padding ngang6, nhóm gap8; có `title`, chưa có tooltip do app render | Thay đúng 3 nút bằng `IconButton`, giữ handler và ý nghĩa; thống nhất hitbox48, glyph20, màu token; không đưa chữ tooltip vào flow |
| Thực đơn → dòng size → Đổi giá | `ProductsScreen.tsx:1021-1037` | Browser desktop: khoảng16×16px, glyph12, padding2, gap nhóm6 | Thay bằng `IconButton`; tách cụm giá/đổi giá/công thức để các điều khiển sát nhau vẫn cách8, không chồng hitbox |
| Thực đơn → dòng size → Gỡ size này | `ProductsScreen.tsx:1041-1049` | PNG/DOM cả3 viewport:22×40px trên Puppeteer Chrome, glyph12, padding ngang4 | Thay bằng `IconButton`; giữ handler gỡ đúng `s.id`; đảm bảo kích thước không co khi dòng hẹp |
| Bảng Món thêm và áp dụng → cột Thao tác | `ProductsScreen.tsx:577-659` | PNG/DOM cả3 viewport: Gán danh mục/Công thức/Sửa/Ngưng/Xóa vẫn có chữ; cao44, gap6, row60. Bảng rộng1310 desktop và1017,67 ở hai tablet, cuộn trong table-wrap; không có tooltip-only | Chỉ kiểm hồi quy ảnh/handler; không đổi chữ thành icon, không sửa kích thước hàng/cột ở task này |
| Bảng Danh mục món, Kích cỡ món → Thao tác | `ProductsScreen.tsx:486-574` | Có PNG/DOM từng tab cả3 viewport; icon + chữ, row60. Không quan sát thấy tooltip làm phình hàng/cột | Kiểm caller và ảnh trước/sau khi nghiệm thu; không tự chuyển thành icon-only hoặc sửa bảng khi chưa xác định lỗi liên quan |
| Sidebar desktop/tablet | `AppShell.tsx:134-180`, `components.css:267-331` | Browser desktop: rail rộng80, nút68×64, glyph24, có nhãn tiếng Việt, gap8. Chưa thấy tooltip-only tại rail | Giữ cấu trúc/nhãn/chiều rộng hiện tại; kiểm hồi quy desktop và hai hướng tablet |
| Header và nút ở Dialog/Drawer | `AppShell.tsx:242,356,475-478`; `Dialog.tsx:128-137`; `Drawer.tsx:80-82` | Source dùng `.icon-btn`48 hoặc topbar-btn có nhãn theo breakpoint; chỉ logout desktop được đo116,69×48 | Kiểm caller do dùng lớp chung; không migrate hoặc thiết kế lại ở task này |

Artifact baseline đã lưu thành công bằng Puppeteer Chrome local, exit0: `.devloopflow/verify/20261114-icon-tooltip-ui/evidence/planning-baseline/`. Có12 PNG theo mẫu `{1440x900,1024x768,768x1024}-{products,toppings,categories,sizes}-before.png`, `baseline-measurements.json` chứa fixture, rect từng nút/bảng/rail và SHA256 source, `SHA256SUMS` chứa hash12 PNG. Đã mở xem ảnh product tablet dọc, topping tablet ngang và category desktop; còn các ảnh khác đã thu với DOM measurements nhưng agent chính cần xem toàn bộ trước trình duyệt. Tool Chrome DevTools ban đầu không ghi được PNG vì workspace-root error; runner Puppeteer hiện có trong dự án đã thu được file local thật. Không dùng ảnh đang loading ở lần thử đầu, không ghi đè evidence lịch sử. Các ảnh này chỉ chứng minh baseline component thật/mock, không phải nghiệm thu thay đổi hoặc API thật. Dùng cùng fixture/cấu hình cho ảnh sau.

## Lỗi cũ cần tránh
- Đã đọc `.devloopflow/errors/INDEX.md` và hồ sơ liên quan `.devloopflow/errors/20261113-shift-close-touch-targets.md:25-26`; quy tắc nguyên văn: “Kiểm kích thước thực của mọi điều khiển ở hai hướng tablet.”
- M-28 — `.devloopflow/MEMORY.md:385-395`: mở harness `node:vm` trước khi thêm import hoặc đổi cấu trúc nút; thêm mock ở biên, giữ các khẳng định có ý nghĩa về hành vi. Không sửa test chỉ để nhận cấu trúc mới.
- M-39 — `.devloopflow/MEMORY.md:518-524`; quy tắc nguyên văn: “Lập ma trận AC–chứng cứ và lưu hash mã; đối chiếu từng vế spec/docs với mã/UI cuối, tình huống và artifact gốc (ảnh, log, request/response, DB khi cần); không suy từ test pass, ảnh đơn lẻ, chứng cứ cũ hay trí nhớ; thiếu hoặc mâu thuẫn thì ghi chưa xác minh và thu lại chứng cứ; kiểm browser thật kích thước chạm, nhãn liên kết và tương phản ở các viewport theo DESIGN.”

## Quyết định
- Làm rõ của user → “Giữ icon, làm tooltip và nút gọn đẹp hơn”.
- Duyệt spec → “duyệt”. Không coi đây là duyệt plan.
- Quyết định kỹ thuật để user kiểm khi duyệt plan: thêm một `IconButton` tận dụng `.icon-btn`, tooltip bên trong component và portal của `react-dom`; chỉ migrate 5 loại nút icon đã nêu trong bảng. Không thêm thư viện tooltip.
- Quyết định tương tác để user kiểm khi duyệt plan: hover chuột hoặc focus bàn phím hiện chú thích; cảm ứng nhấn giữ500ms để đọc, không thực hiện hành động. Chạm ngắn thực hiện hành động cũ một lần. Không yêu cầu người dùng mở tooltip trước khi thao tác.

## Giả định
- Không có giả định business cần user xác nhận. Những giá trị timing/kích thước tooltip dưới đây là đề xuất thiết kế của plan, chưa mô tả thành hành vi hiện có; được xem xét tại cổng duyệt plan.
- Fixture là dữ liệu minh họa được đánh dấu mock, không suy ra trạng thái nghiệp vụ hay API từ fixture. Căn cứ: spec mục Thành công/G4, `.devloopflow/devloopflow.md:34-39`, quy tắc QA tại `AGENTS.md`.

## Phạm vi
- Trong: 5 loại nút icon trên product card và dòng size; component nút icon/tooltip dùng lại được trong phạm vi đó; nhóm bố cục trực tiếp chứa những nút này; kiểm hồi quy bảng và sidebar đã rà.
- Ngoài: đổi mọi nút chữ thành icon; thay rail thành icon-only; sửa bảng có chữ khi chưa xác định lỗi do thay đổi này; restyle các màn khác; đổi nghiệp vụ/quyền/handler; DB/API; dependency mới; seed hoặc dọn dữ liệu; push/merge.
- Không đổi `Button`, `.btn`, `.btn-sm` toàn cục; lớp mới chỉ tác động `IconButton` và nhóm nút sản phẩm được migrate. Các nút chữ Tải ảnh/Gỡ ảnh/Thêm size/Công thức giữ nhãn; chỉ chỉnh container trực tiếp để đủ khoảng cách và không chồng mục tiêu chạm.

## Thiết kế tổng thể
- Luồng chính:
  1. Render nút native `type="button"`, icon20px trang trí `aria-hidden`, tên tiếng Việt từ `label` qua `aria-label`; diện tích48×48, không có padding kế thừa của `.btn`.
  2. Hover bằng chuột hoặc focus bàn phím mở tooltip. Tab không bị chặn. Enter/Space vẫn dùng cơ chế button native và gọi handler đúng một lần.
  3. Tooltip là text thuần, `role="tooltip"`, ID từ `useId`, được liên kết bằng `aria-describedby` khi mở; dùng portal vào `document.body`, position fixed. Không thêm tab stop hoặc nút trong tooltip.
  4. Đặt tooltip cách trigger8px, ưu tiên phía trên; lật xuống khi thiếu chỗ; clamp ngang trong viewport cách mép8px. Max-width min(240px, viewport−16px), chữ13px/18px, padding6px8px, radius theo `--radius-control`; dùng token surface/text/border và shadow overlay hiện có. Text dài xuống dòng; không làm tràn ngang.
  5. Giữ tooltip mở khi con trỏ đi sang nội dung tooltip; đóng khi rời cả trigger và tooltip, mất focus, Escape, scroll/resize hoặc unmount. Nếu Escape đang đóng tooltip thì không để cùng phím đó đóng hộp thoại cha; Escape khi tooltip đã đóng giữ hành vi cha.
  6. Touch: pointerdown bắt đầu timer500ms; pointerup trước500ms giữ click mặc định. Khi đủ500ms mới mở tooltip và chặn đúng click tổng hợp của lần nhấn giữ đó; không gọi onClick/onDoubleClick của action. Pointercancel, dịch chuyển trên8px hoặc scroll hủy timer, không bật tooltip và không biến scroll thành thao tác. Chạm ngoài đóng tooltip và vẫn giữ thao tác gốc của phần tử bên ngoài.
  7. Nút disabled vẫn native disabled và không gọi handler. Chỉ khi disabled, wrapper nhận một tab stop để đọc label/tooltip bằng focus; wrapper `role="group"` và `aria-label` tên hành động, nút trong không nhận thêm tab stop. Không biến disabled thành button hoạt động, không bỏ trạng thái disabled để làm tooltip.
- Thành phần: `IconButton`, `.icon-btn` hiện có, lớp CSS scope `.icon-action`/`.icon-action-tooltip`, product action containers; React/ReactDOM hiện có.
- Quyết định | lý do | phương án đã loại:
  - Component riêng | giới hạn ảnh hưởng, tái dùng `.icon-btn`48 | sửa padding `.btn` toàn cục ảnh hưởng mọi Button.
  - Portal fixed | không bị `.table-wrap`, card hoặc sidebar overflow cắt | tooltip đặt trong flow làm đổi chiều rộng/chiều cao.
  - Tên tiếng Việt độc lập tooltip | thao tác không phụ thuộc hover | chỉ dựa native `title` không kiểm soát được bàn phím/touch.
  - Giữ rail có nhãn và bảng nút chữ | khảo sát chưa chứng minh cần đổi | mở rộng redesign không có bằng chứng.

## Thay đổi dữ liệu
- Không có bảng/cột/index/migration/rollback dữ liệu. Chỉ UI, không sửa request payload hoặc trạng thái nghiệp vụ. Rollback code bằng revert commit riêng sau review, không dùng reset/restore đè working tree.

## API contract tổng
- Không có endpoint, request, response, permission hoặc mã lỗi thay đổi. Giữ các handler và `menuService` hiện có tại `ProductsScreen.tsx:143-483`.

## AC tổng end-to-end
- [x] E2E-AC-1: Given 2 món fixture và size M, When mở Món & Giá bán tại1440×900,1024×768,768×1024, Then 5 loại nút được migrate có hitbox48×48 trở lên, glyph20, khoảng cách giữa các hitbox kề nhau tối thiểu8, không chồng chữ giá hoặc Công thức (browser đo DOM + ảnh, G1/G2/G4).
- [x] E2E-AC-2: Given mỗi nút được migrate, When hover/focus/nhấn giữ500ms, Then tooltip text đúng tên tiếng Việt, nằm hoàn toàn trong viewport với mép8, không bị clipping và không đổi rect card/hàng/container hơn1px; Escape đóng tooltip, Tab đi tiếp theo thứ tự hiển thị (browser, G2/G3).
- [x] E2E-AC-3: Given nút enabled, When chạm ngắn hoặc Enter/Space, Then handler đúng nút được gọi đúng1 lần; nhấn giữ chỉ đọc tooltip gọi0 lần; disabled/scroll/pointercancel gọi0 lần; không mở nhầm dialog hoặc đổi trạng thái (browser spy ở biên, G3/G4).
- [x] E2E-AC-4: Given các bảng Món thêm/Danh mục/Kích cỡ và rail trong cùng fixture, When so trước/sau ở3 viewport, Then giữ nhãn/ý nghĩa/thứ tự/điều kiện quyền và rect của nút/rail ngoài phạm vi không đổi hơn1px; dialog chứa nút hủy/đóng và Button.disabledReason hiện có hoạt động như trước (ảnh + regression, G1/G4).
- [x] E2E-AC-5: Given source cuối, When kiểm AC, Then mỗi AC có artifact gốc và SHA256 tương ứng trong evidence, nhãn mock hay tích hợp thật rõ ràng; thiếu bằng chứng hoặc môi trường ghi chưa xác minh, không suy PASS từ build/test (G4, M-39).

## Review Focus
- RF-1: Đọc tooltip rồi nhấn Escape trong dialog → chỉ đóng tooltip lần đầu, không mất nội dung dialog → `ICON-ESC-PARENT` (ST-1).
- RF-2: Bắt đầu giữ rồi cuộn/chuyển màn → timer được hủy, không xuất hiện tooltip hoặc gọi handler sau unmount → `ICON-POINTER-CANCEL` (ST-1).
- RF-3: Món chuyển active/inactive hoặc sắp xếp lại danh sách → tên tooltip đi theo đúng món/hành động và ID mô tả không trùng → `MENU-ACTION-IDENTITY` (ST-2).

## Sub-tasks

### ST-1: Nút icon 48px và tooltip không phụ thuộc hover
- depends_on: -
- Interfaces:
  - Consumes: Không có từ sub-task trước; dùng React18/ReactDOM18 và `.icon-btn` sẵn có.
  - Produces: `IconButton(props: IconButtonProps): React.ReactElement`; `IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title' | 'aria-label'> & { label: string; icon: React.ReactNode }`.
- Mục tiêu: component giới hạn kích thước, tên truy cập và tương tác chú thích an toàn.
- AC riêng:
- [x] ST-1.AC-1: Given label “Sửa thông tin” và icon Edit2, When render/hover/focus, Then nút48×48,glyph20, aria-label chính xác, tooltip role/id liên kết đúng; không render native title trùng (browser `ICON-NAME-SIZE`).
- [x] ST-1.AC-2: Given trigger sát4 mép viewport và trong overflow:hidden, When mở tooltip dài240 ký tự tiếng Việt, Then tooltip trong viewport cách mép8px, không bị clipping/overflow ngang và không đổi layout hơn1px (browser `ICON-PORTAL-BOUNDS`).
- [x] ST-1.AC-3: Given onClick spy, When click/Enter/Space/chạm ngắn, Then mỗi lần gọi1; giữ500ms gọi0 và lần chạm ngắn sau đó gọi1; disabled giữ/focus có chú thích nhưng gọi0 (browser `ICON-INPUT-MODES`).
- [x] ST-1.AC-4: Given tooltip mở trong dialog, When Escape rồi Escape lần2, Then tooltip đóng lần1, dialog cha chỉ nhận lần2; pointercancel/move9px/scroll/unmount trước timer không mở tooltip hoặc gọi action (browser `ICON-ESC-PARENT`, `ICON-POINTER-CANCEL`).
- Plan chi tiết:
  - File tạo/sửa: tạo `POS_UI/src/components/ui/IconButton.tsx`; thêm CSS scoped trong `POS_UI/src/styles/components.css`; tạo `POS_UI/test/icon-actions.browser.mjs`.
  - Chữ ký: như Produces. Label truyền literal/hành động động từ caller, không nhận HTML tooltip. Component không tự quyết nghiệp vụ hay permission. Không tạo provider/config mới.
  - DTO/schema: không có; props label:string bắt buộc, icon:ReactNode bắt buộc, native attributes kế thừa; thiếu label được TypeScript báo lỗi, không nhận fallback tiếng Anh. Các test phải có label không rỗng.
  - DB/migration: không có vì chỉ UI.
  - API: không có; fixture dùng spy tại onClick.
  - Các bước xử lý: (1) viết browser regression đỏ cho kích thước và các input mode; (2) implement theo7 bước thiết kế tổng thể; (3) cleanup timer/listener/portal khi đóng và unmount; (4) chạy browser tests và UI build/test.
  - Quy tắc: `DESIGN.md:33,133-155,646-655`, spec G2/G3; text tooltip tương phản tối thiểu4,5:1, focus rõ theo token outline hiện có ở `POS_UI/src/index.css:141-143`.
  - Edge case: disabled → wrapper focus đọc được, không action; label dài → wrap≤240px; hover chuyển tooltip → vẫn đọc được; touch scroll9px → hủy giữ; label thay đổi → text mới; nút biến mất → cleanup.
  - Ảnh hưởng caller: chưa migrate màn ở ST này; `.icon-btn` cũ giữ nguyên style, lớp mới scope riêng. `Button`, Dialog và Drawer không đổi.
  - Tác dụng phụ: chỉ portal/timer/event listener trong UI, cleanup đầy đủ; không log label hay request, không HTTP/DB.
- Lỗi cũ liên quan: `20261113-shift-close-touch-targets.md` → đo48×48 hai hướng tablet; M-28 → không đưa hook mới vào harness cũ thiếu mock.
- Test viết trước:
  - [x] `ICON-NAME-SIZE`: label như AC1 → tên đúng, hitbox48, glyph20.
  - [x] `ICON-PORTAL-BOUNDS`:4 mép/overflow/chuỗi240 ký tự → trong viewport, rect layout delta≤1px.
  - [x] `ICON-INPUT-MODES`:3 kiểu input và disabled → count1 hoặc0 theo AC3, không để click bị chặn ở lần kế tiếp.
  - [x] `ICON-ESC-PARENT`: dialog mở + tooltip mở → parent count0 rồi1.
  - [x] `ICON-POINTER-CANCEL`: pointercancel/move9px/scroll/unmount → tooltip0/action0 sau mốc500ms.
- Tiến độ:
  - [x] Red
  - [x] Green
  - [ ] Refactor
  - [x] Test module xanh

### ST-2: Áp dụng vào đúng nút sản phẩm, kiểm caller và giao diện
- depends_on: ST-1
- Interfaces:
  - Consumes: `IconButton(props: IconButtonProps): React.ReactElement`; `IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title' | 'aria-label'> & { label: string; icon: React.ReactNode }` từ ST-1.
  - Produces: Không có interface mới cho sub-task sau.
- Mục tiêu: sửa5 loại nút đã xác định, chứng minh hành động và giao diện ngoài phạm vi giữ nguyên.
- AC riêng:
- [x] ST-2.AC-1: Given owner fixture2 món/size M, When render3 viewport, Then toàn bộ nút5 loại được migrate đạt48×48/gap8, icon20; label lần lượt “Sửa thông tin”, “Ngưng bán”/“Mở bán lại”, “Xóa món”, “Đổi giá”, “Gỡ size này”; không bị flex co, giá/nhãn không đè nhau (browser `MENU-ACTION-LAYOUT`).
- [x] ST-2.AC-2: Given product p1/ps1 và p2/ps2, When tương tác mỗi action qua spy và cập nhật fixture active hoặc đổi thứ tự món, Then handler nhận đúng product/size ID, giữ xác nhận xóa hiện có, label động đúng, không trùng tooltip ID, giữ quyền cũ (browser `MENU-ACTION-IDENTITY`).
- [x] ST-2.AC-3: Given bảng topping/category/size, rail, nút chữ và invoice disabledReason, When chạy regression trước/sau, Then không thay nhãn/thứ tự/hiển thị quyền; nút ngoài scope và rail rect delta≤1px; default Button và disabledReason giữ hành vi (browser `MENU-CALLER-REGRESSION` + UI tests).
- [x] ST-2.AC-4: Given fixture tải chậm, danh sách rỗng hoặc menuService reject, When mở Thực đơn, Then giữ trạng thái tải/rỗng/lỗi hiện có, không để tooltip từ dữ liệu cũ trên màn hoặc gọi mutation (browser `MENU-DATA-STATES`).
- Plan chi tiết:
  - File tạo/sửa: sửa `POS_UI/src/features/products/ProductsScreen.tsx` tại5 loại nút trong inventory; thêm lớp `.menu-product-actions` và `.menu-size-actions` scope trực tiếp trong `POS_UI/src/styles/ui.css`; mở rộng `POS_UI/test/icon-actions.browser.mjs` với fixture component thật. Không sửa `AppShell`, `Button`, `DataTable`, `Dialog`, `Drawer` hoặc các service.
  - Chữ ký: không đổi export/hàm handler màn hiện tại; import `IconButton` từ ST-1. Handler sửa/toggle/xóa/đổi giá/gỡ size giữ body và tham số hiện có.
  - DTO/schema: không có DTO mới; tái dùng `MenuProduct`, `MenuProductSize` tại `POS_UI/src/services/menuService.ts:24-52`.
  - DB/migration: không có.
  - API: không thay; test mock biên service, verify không suy là API thật.
  - Các bước xử lý: (1) trước sửa thu baseline PNG/rect cho3 viewport từ source hiện tại với fixture ghi rõ mock; (2) viết test đỏ action layout/identity; (3) thay native/`Button size=sm` icon-only bằng IconButton với đúng label và onClick; bỏ inline height24/26 và padding tại các nút đó; (4) nhóm hitbox gap8, cho container wrap khi thiếu chỗ, mỗi cụm giữ thứ tự DOM và giá/nhãn; không dùng margin âm hoặc vùng chạm lấn nút kế; (5) chạy unit/browser/build; (6) thu ảnh sau, đối chiếu inventory và quyền/caller.
  - Quy tắc: spec G1-G4, `DESIGN.md:33,651-655`; permission/confirm/error handling giữ nguyên source `ProductsScreen.tsx:36-40,143-483,662-677`.
  - Edge case: card hẹp ở768 → cụm wrap theo hitbox, không cắt nút; 2 size → ID mô tả duy nhất; trạng thái inactive → Mở bán lại đúng; không có inventory.view → không render Công thức như trước; không có quyền quản lý → giữ màn từ chối; empty/error → không có tooltip cũ.
  - Ảnh hưởng caller: màn product là caller mới duy nhất của IconButton; kiểm toàn bộ caller hiện có của `.icon-btn`/Button để xác nhận CSS scope không rò. Các bảng chữ là hồi quy, không phải đối tượng cải tạo.
  - Tác dụng phụ: không thêm request/log/event; hành động cũ chỉ chạy khi người dùng thực hiện thao tác action. Browser test spy không ghi dữ liệu.
- Lỗi cũ liên quan: M-28 đọc các harness trước đổi import; M-39 yêu cầu artifact/source hash và hai hướng tablet; lỗi mục tiêu chạm → đo từng nút thực, không chỉ xem CSS.
- Test viết trước:
  - [x] `MENU-ACTION-LAYOUT`:2 món/1 size,3 viewport →48×48, gap≥8, không chồng/cắt.
  - [x] `MENU-ACTION-IDENTITY`: đảo thứ tự, active/inactive,5 action → đúng ID và label, không duplicate description ID.
  - [ ] `MENU-CALLER-REGRESSION`:3 bảng/rail/default Button/disabledReason → nhãn và rect như baseline trong sai số1px.
  - [ ] `MENU-DATA-STATES`: delayed/empty/reject service → trạng thái cũ,0 mutation/tooltip cũ.
- Tiến độ:
  - [ ] Red
  - [ ] Green
  - [ ] Refactor
  - [ ] Test module xanh

## Ma trận AC ↔ test

| AC | Test | Input | Expected |
|---|---|---|---|
| ST-1.AC-1; E2E-AC-1/2 | ICON-NAME-SIZE | Edit2, label Sửa thông tin |48×48,glyph20,tên đúng,tooltip linked |
| ST-1.AC-2; E2E-AC-2 | ICON-PORTAL-BOUNDS |4 mép/overflow/text240 ký tự | tooltip trong mép8, layout delta≤1 |
| ST-1.AC-3; E2E-AC-3 | ICON-INPUT-MODES | click/Enter/Space/touch/hold/disabled | đúng1 hoặc0 lần, click tiếp theo không bị mất |
| ST-1.AC-4; RF-1; E2E-AC-2/3 | ICON-ESC-PARENT | Escape2 lần trong dialog | đóng tooltip rồi giữ hành vi cha |
| ST-1.AC-4; RF-2; E2E-AC-3 | ICON-POINTER-CANCEL | cancel/move9/scroll/unmount | không tooltip/action sau timer |
| ST-2.AC-1; E2E-AC-1 | MENU-ACTION-LAYOUT |2 món/size M,3 viewport | tất cả hitbox/gap đạt, không chồng chữ |
| ST-2.AC-2; RF-3; E2E-AC-3/4 | MENU-ACTION-IDENTITY | reorder/inactive/permission | đúng ID/label, giữ confirm/quyền |
| ST-2.AC-3; E2E-AC-4 | MENU-CALLER-REGRESSION | bảng/rail/Button cũ | đúng nhãn/thứ tự,rect delta≤1 |
| ST-2.AC-4; E2E-AC-4 | MENU-DATA-STATES | loading/empty/reject | phản hồi cũ,0 mutation/tooltip cũ |
| E2E-AC-5 | verify-ac đối chiếu inventory/AC/artifact | source hash + log + PNG + measurements | đầy đủ liên kết; thiếu ghi chưa xác minh |

## Rủi ro
- Nút cũ nhỏ hơn chuẩn, sửa đúng48px có thể làm card cao hơn → glyph20 và nhóm scope riêng, wrap có chủ đích; không hứa giảm mọi kích thước hình học dưới chuẩn.
- Chạm giữ dễ gây click tổng hợp → test pointer/touch thật qua Chrome input, spy action0 và lần chạm sau1; không chỉ dispatch event giả rồi kết luận cảm ứng đạt.
- Portal và Escape có thể tương tác Dialog/Drawer → kiểm nesting/focus/Escape, close khi scroll/resize/unmount; không sửa focus trap cha.
- Ảnh fixture chỉ chứng minh frontend → luôn ghi mock biên; QA tích hợp chỉ dùng sandbox có phiên phù hợp và chỉ GET/điều hướng khi không được phép đổi dữ liệu. Không login/seed để lách yêu cầu chỉ đọc.
- Chrome tool ban đầu không lưu được PNG workspace; Puppeteer đã thu12 PNG baseline thành công → dùng runner này cho ảnh sau, giữ fixture/source hash và ma trận artifact; không dùng tên file dự kiến làm bằng chứng file đã tồn tại.

## Lệnh kiểm tra
- Lint: dự án không có script lint; không bịa `npm run lint` (`POS_UI/package.json:6-11`). Skill có inspector riêng, không coi là project lint.
- Typecheck: trong `POS_UI/`, `npm run typecheck`.
- Test UI: trong `POS_UI/`, `npm test`.
- Browser test mới: trong `POS_UI/`, `node --test test/icon-actions.browser.mjs`; theo cách chạy browser file hiện có, cần Chrome/Chromium hoặc `CHROME_BIN`. File `.browser.mjs` không thuộc glob `npm test`; phải chạy riêng.
- Browser regression cũ: trong `POS_UI/`, `node --test test/shift-close-accessibility.browser.mjs` khi sửa CSS chung để kiểm phạm vi ảnh hưởng.
- Build: trong `POS_UI/`, `npm run build`.
- Coverage: không có script coverage trong manifest, không thêm ở task này.
- Chạy app: trong `POS_UI/`, `npm run dev` khi `VITE_API_TARGET` đã cấu hình cho API sandbox được xác minh; mặc định UI5173. Harness component thật/mock là phương án baseline không cần API, dùng mô hình esbuild write:false/puppeteer của `shift-close-accessibility.browser.mjs:13-49`, mock stable ở biên; không ghi bundle vào source, không sửa dữ liệu.
- Design review: áp dụng `.agents/skills/design-taste-frontend/references/app-screens.md:296-346,773-791,866-870,1118-1160` cho trạng thái, action, icon, ảnh và look/fix tối đa3 vòng. Không deal style/shell mới vì spec cấm redesign toàn màn; giữ `DESIGN.md` và brand hiện có. Inspector browser bổ sung chỉ khi có runner đọc được fixture; không suy PASS từ inspector trên trang đăng nhập.
- QA cuối: `devloopflow:verify-ac`,3 viewport1440×900,1024×768,768×1024; keyboard/hover/touch/disabled/cạnh viewport; raw PNG/rect/input counts/log/source SHA256 tại `.devloopflow/verify/20261114-icon-tooltip-ui/evidence/`, report và fails tại thư mục cha. Hết scope thì dừng; không chạy API full suite khi không thay backend.
- Graph sau thay đổi: `graphify update .` cho AST; semantic update giới hạn Markdown hiện hành theo `.codex/skills/graphify/references/update.md`, không quét hồ sơ lịch sử; kiểm marker trước mọi query.

## Câu hỏi mở
- Không có câu hỏi business. Lựa chọn interaction500ms/geometry/giới hạn caller được trình duyệt trong plan này. Baseline mock đã có artifact local, chưa có AC triển khai nào PASS.

## Changelog plan
- 2026-11-14: tạo draft từ spec được duyệt, source/caller và quan sát component thật trong browser với mock biên API; ghi đúng hạn chế không lưu được PNG.
- 2026-11-14: thu bổ sung12 PNG baseline, DOM measurements và hash qua Puppeteer có sẵn; cập nhật inventory/checklist theo artifact thực, giữ giới hạn mock và phạm vi bảng/sidebar chỉ hồi quy.
- 2026-11-14: user nói “duyệt”; plan được duyệt.

## Kiểm tra sẵn sàng
- [x] Không còn từ mơ hồ/TBD/TODO hoặc fact thiếu nguồn cần user quyết trước khi lập plan.
- [x] Fact triển khai có nguồn; timing/geometry mới được ghi rõ là đề xuất của plan cần duyệt.
- [x] Giữ đủ các mục template; mục không áp dụng có lý do.
- [x] Interfaces ST-2 Consumes khớp chữ ký ST-1 Produces.
- [x] Mỗi Review Focus có test trong ma trận.
- [x] Không có câu hỏi business chưa trả lời hoặc giả định business tự đặt.
- [x] Mỗi sub-task có AC đo được, file, bước xử lý, edge case và test input/expected riêng.
- [x] Mỗi AC có test hoặc đối chiếu verify-ac; mỗi test thuộc AC.
- [x] Happy path/quyền/disabled/biên/loading/error/cảm ứng được chỉ rõ; không thêm API test cho thay đổi không đổi API.
- [x] Mọi AC nằm riêng dòng, chưa tick PASS.
- [x] Danh sách source/test/CSS đủ; không migration/config/dependency mới. Hồ sơ task/report/evidence do agent chính ghi theo flow.
- [x] Đã đối chiếu errors/M-28/M-39, ghi quy tắc phòng tránh.
- [x] Lệnh project có nguồn; file browser mới và lệnh chạy được đánh dấu là phần sẽ tạo, không báo đã chạy.
- [x] Agent khác có đủ phạm vi, interfaces, hành vi và cách kiểm; chưa triển khai trước duyệt plan.
- [x] PNG baseline local đủ3 viewport, product actions và3 bảng đã lưu:12 PNG + measurements + source hashes + SHA256SUMS tại evidence/planning-baseline; agent chính mở xem toàn bộ trước trình duyệt.
