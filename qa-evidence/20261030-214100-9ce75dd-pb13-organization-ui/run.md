# PB-13 tổ chức — local implementation verification

**Trạng thái lịch sử30/10:** các lượt triển khai/red/green và browser được giữ nguyên. Bản cuối đã được kiểm chứng và QA đối chiếu ngày01/11 tại [run tiếp tục](../20261101-203100-9ce75dd-pb13-final/run.md), [audit](../20261101-203100-9ce75dd-pb13-final/audit.md), [code review](../20261101-203100-9ce75dd-pb13-final/review.md). Không dùng artifact UI trước rowsKey thay bản cuối; các giới hạn phiên bản được mô tả trong run mới. Bằng chứng local, chưa CI/production hoặc nghiệm thu Sprint3.

Nhánh feat/pb13-organization-ui; HEAD/base9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18; working tree dirty gồm PB04 từ task trước. Không commit/push/merge. commands.log lưu thời gian/lệnh/exit thực; service-red.log là red import trước implementation. Ma trận dưới lập trước các lượt kiểm chứng green/UI/API/browser; không diễn giải import-red thành lỗi runtime.

| Tiêu chí | Tình huống | Artifact cần lưu |
| --- | --- | --- |
| HTTP10routes/cookie/CSRF/types/errors/unknown outcome | PB13-HTTP service tests + auth/platform regression | stdout runner, request assertions; raw network browser đã che |
| Branch/bàn/staff CRUD/config/reload | OWNER live isolated QA DB, nullable/money/capacity/unique/defaults/inactive | test output, browser snapshots/screenshots before-after, method/path/status/requestId, DB readonly before-after |
| Quyền/auth/current context | OWNER/MANAGER/CASHIER/platform, forcechange/revoked/reset/locked/suspended | controlled UI tests + live API/browser, storage metadata không token |
| Cursor/filter/choices | >20rows, >100branch choices, no hidden firstpage cap | controlled service/UI + browser paging/network and exact expectedIDs |
| Race | deferred response tab/branch/status/role/page/session/mutation | source-connected UI runner output + browser scenario snapshots/network |
| Temporary password | ack/copy/manual/cancel/clear/logout/reload/no storage/list refresh failure | UI test stdout + safe browser assertions/snapshot che password, readonly DB/session effects |
| Accessibility/layout |1024/768, keyboard/focus/targets/empty/error/loading/offline | browser raw snapshot/image/computed dimensions + expected/actual |
| Final version/review | UI test/typecheck/build, API test, final hashes and code review/QA matrix | exact logs/time/exit/env/source/runtime/contract manifests + independent reviewer audit |

Không browser artifact hoặc số pass giả. Mọi thiếu được ghi chưa xác minh; không tick Sprint3 thay Product Owner. Không triển khai/quyết định khóa quỹ sau ca PB06 hoặc production.
