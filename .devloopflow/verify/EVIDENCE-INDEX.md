# Verify evidence locations

Historical evidence only. These indexes do not add or change an AC result.

- Each folder `verify/<run folder>/` below keeps the original qa-evidence run name. Markdown reports that were tracked by Git sit in the run folder (relative links rebased); every raw file sits in `verify/<run folder>/evidence/` (local only, ignored by Git) with a `SHA256SUMS` file (`sha256sum -c` format, paths relative to `evidence/`).
- [Sprint 08 verify evidence](20261109-sprint08-payment/EVIDENCE-INDEX.md): 1000 existing files inventoried in place; no duplicate copy.
- [README.md](README.md): the former qa-evidence/README.md (only its paths to the moved evidence were updated).
- Raw evidence and files under evidence/ are local and ignored by Git. Reports and fails.md are versioned Markdown only when sanitized.

## Historical QA runs (133 folders)

| Run folder | Versioned reports | Raw files in evidence/ |
| --- | --- | ---: |
| 2026-10-29-091105-fc2b07d | [run.md](2026-10-29-091105-fc2b07d/run.md) | 2 |
| 2026-10-29-091209-fc2b07d | [run.md](2026-10-29-091209-fc2b07d/run.md) | 2 |
| 2026-10-29-091245-fc2b07d | [run.md](2026-10-29-091245-fc2b07d/run.md) | 2 |
| 2026-10-29-091320-fc2b07d | [run.md](2026-10-29-091320-fc2b07d/run.md) | 2 |
| 2026-10-29-091412-fc2b07d | [run.md](2026-10-29-091412-fc2b07d/run.md) | 2 |
| 2026-10-29-091517-fc2b07d | [run.md](2026-10-29-091517-fc2b07d/run.md) | 2 |
| 2026-10-29-091545-fc2b07d | [run.md](2026-10-29-091545-fc2b07d/run.md) | 2 |
| 2026-10-29-093047-fc2b07d | [run.md](2026-10-29-093047-fc2b07d/run.md) | 3 |
| 2026-10-29-093310-fc2b07d | [run.md](2026-10-29-093310-fc2b07d/run.md) | 3 |
| 2026-10-29-093400-fc2b07d | [run.md](2026-10-29-093400-fc2b07d/run.md) | 3 |
| 2026-10-29-101045-fc2b07d | [run.md](2026-10-29-101045-fc2b07d/run.md) | 1 |
| 2026-10-29-101138-fc2b07d | [run.md](2026-10-29-101138-fc2b07d/run.md) | 3 |
| 2026-10-29-103359-1083cd9-qa-pb02 | [cases.md](2026-10-29-103359-1083cd9-qa-pb02/cases.md), [run.md](2026-10-29-103359-1083cd9-qa-pb02/run.md) | 3 |
| 2026-10-29-105135-1083cd9-pb02-tests | [run.md](2026-10-29-105135-1083cd9-pb02-tests/run.md) | 3 |
| 2026-10-29-105348-1083cd9-qa-recheck | [cases.md](2026-10-29-105348-1083cd9-qa-recheck/cases.md), [run.md](2026-10-29-105348-1083cd9-qa-recheck/run.md) | 4 |
| 2026-10-29-111207-66c92cb-pb13-local | [run.md](2026-10-29-111207-66c92cb-pb13-local/run.md) | 6 |
| 2026-10-29-112100-66c92cb-chrome-pb13 | [run.md](2026-10-29-112100-66c92cb-chrome-pb13/run.md) | 3 |
| 2026-10-29-112640-66c92cb-demo-auth | [run.md](2026-10-29-112640-66c92cb-demo-auth/run.md) | 3 |
| 2026-10-29-1238-66c92cb-ui-rebuild | [run.md](2026-10-29-1238-66c92cb-ui-rebuild/run.md) | 4 |
| 2026-10-29-1241-66c92cb-review-retest | [run.md](2026-10-29-1241-66c92cb-review-retest/run.md) | 9 |
| 2026-10-29-1327-66c92cb-pb02-acceptance | [run.md](2026-10-29-1327-66c92cb-pb02-acceptance/run.md) | 6 |
| 2026-10-29-1356-66c92cb-e2e | [run.md](2026-10-29-1356-66c92cb-e2e/run.md) | 26 |
| 2026-10-29-1406-66c92cb-acceptance-audit | [run.md](2026-10-29-1406-66c92cb-acceptance-audit/run.md) | 4 |
| 2026-10-29-1430-66c92cb-browser-artifacts | [run.md](2026-10-29-1430-66c92cb-browser-artifacts/run.md) | 10 |
| 2026-10-29-1501-51c0673-qa-acceptance | [run.md](2026-10-29-1501-51c0673-qa-acceptance/run.md) | 5 |
| 2026-10-29-1513-e317d73-pb13-final-e2e | [run.md](2026-10-29-1513-e317d73-pb13-final-e2e/run.md) | 29 |
| 2026-10-29-1523-e317d73-qa-final-audit | [run.md](2026-10-29-1523-e317d73-qa-final-audit/run.md) | 3 |
| 2026-10-29-1641-edbe318-api-response | [run.md](2026-10-29-1641-edbe318-api-response/run.md) | 2 |
| 2026-10-29-173344-49f0f8d-ts6-config | [run.md](2026-10-29-173344-49f0f8d-ts6-config/run.md) | 6 |
| 2026-10-29-auth-proxy-fix-local | [run.md](2026-10-29-auth-proxy-fix-local/run.md) | 5 |
| 2026-10-29-bootstrap-admin-local | [run.md](2026-10-29-bootstrap-admin-local/run.md) | 2 |
| 2026-10-29-qa-independent-66c92cb | [run.md](2026-10-29-qa-independent-66c92cb/run.md) | 9 |
| 2026-10-29-qa-recheck-1300-66c92cb | [run.md](2026-10-29-qa-recheck-1300-66c92cb/run.md) | 6 |
| 2026-10-29-review-fixes-local | [run.md](2026-10-29-review-fixes-local/run.md) | 5 |
| 2026-10-30-103643-4db3149-module-structure | [run.md](2026-10-30-103643-4db3149-module-structure/run.md) | 34 |
| 2026-10-30-112626-64441b2-env | [run.md](2026-10-30-112626-64441b2-env/run.md) | 18 |
| 20261028-125139-842ba1e | [run.md](20261028-125139-842ba1e/run.md) | 6 |
| 20261028-125327-842ba1e | [run.md](20261028-125327-842ba1e/run.md) | 4 |
| 20261028-130230-842ba1e | [run.md](20261028-130230-842ba1e/run.md) | 4 |
| 20261028-130744-842ba1e | [run.md](20261028-130744-842ba1e/run.md) | 2 |
| 20261028-130846-842ba1e | [run.md](20261028-130846-842ba1e/run.md) | 2 |
| 20261028-131024-842ba1e | [run.md](20261028-131024-842ba1e/run.md) | 4 |
| 20261028-131115-842ba1e | [run.md](20261028-131115-842ba1e/run.md) | 2 |
| 20261028-131159-842ba1e | [run.md](20261028-131159-842ba1e/run.md) | 4 |
| 20261028-150459-cdcc096 | [run.md](20261028-150459-cdcc096/run.md) | 2 |
| 20261028-151910-cdcc096 | [run.md](20261028-151910-cdcc096/run.md) | 3 |
| 20261028-152045-cdcc096 | [run.md](20261028-152045-cdcc096/run.md) | 3 |
| 20261028-153707-cdcc096 | [run.md](20261028-153707-cdcc096/run.md) | 3 |
| 20261028-153844-cdcc096 | [run.md](20261028-153844-cdcc096/run.md) | 3 |
| 20261028-154329-cdcc096 | [run.md](20261028-154329-cdcc096/run.md) | 2 |
| 20261028-154810-cdcc096 | [run.md](20261028-154810-cdcc096/run.md) | 2 |
| 20261028-163520-cdcc096 | [run.md](20261028-163520-cdcc096/run.md) | 2 |
| 20261028-171100-cdcc096 | [run.md](20261028-171100-cdcc096/run.md) | 1 |
| 20261028-172500-cdcc096 | [run.md](20261028-172500-cdcc096/run.md) | 1 |
| 20261029-202132-53d794b | [run.md](20261029-202132-53d794b/run.md) | 129 |
| 20261030-0158-53d794b-pb03-rework | [qa-audit.md](20261030-0158-53d794b-pb03-rework/qa-audit.md), [run.md](20261030-0158-53d794b-pb03-rework/run.md) | 35 |
| 20261030-193116-9ce75dd-pb04 | [review.md](20261030-193116-9ce75dd-pb04/review.md), [run.md](20261030-193116-9ce75dd-pb04/run.md) | 37 |
| 20261030-200921-9ce75dd-pb04-evidence-audit | [audit.md](20261030-200921-9ce75dd-pb04-evidence-audit/audit.md) | 1 |
| 20261030-202325-9ce75dd-pb04-gap-fix | [audit.md](20261030-202325-9ce75dd-pb04-gap-fix/audit.md), [review.md](20261030-202325-9ce75dd-pb04-gap-fix/review.md), [run.md](20261030-202325-9ce75dd-pb04-gap-fix/run.md) | 28 |
| 20261030-214100-9ce75dd-pb13-organization-ui | [PUBLICATION.md](20261030-214100-9ce75dd-pb13-organization-ui/PUBLICATION.md), [audit.md](20261030-214100-9ce75dd-pb13-organization-ui/audit.md), [run.md](20261030-214100-9ce75dd-pb13-organization-ui/run.md) | 420 |
| 20261030-platform-tab-race | [qa-acceptance-audit.md](20261030-platform-tab-race/qa-acceptance-audit.md), [run.md](20261030-platform-tab-race/run.md) | 26 |
| 20261101-203100-9ce75dd-pb13-final | [acceptance-readiness.md](20261101-203100-9ce75dd-pb13-final/acceptance-readiness.md), [audit.md](20261101-203100-9ce75dd-pb13-final/audit.md), [review.md](20261101-203100-9ce75dd-pb13-final/review.md), +1 | 97 |
| 20261102-113000-31f4799-pb05-menu | [run.md](20261102-113000-31f4799-pb05-menu/run.md) | 3 |
| 20261102-114500-31f4799-qa-audit | [run.md](20261102-114500-31f4799-qa-audit/run.md) | 9 |
| 20261102-190753-31f4799-docker-qa | [run.md](20261102-190753-31f4799-docker-qa/run.md) | 9 |
| 20261102-212200-7d5eba1-pb06-shifts | [run.md](20261102-212200-7d5eba1-pb06-shifts/run.md) | 5 |
| 20261102-213040-7d5eba1 | [run.md](20261102-213040-7d5eba1/run.md) | 6 |
| 20261102-215000-7d5eba1-pre-commit | [run.md](20261102-215000-7d5eba1-pre-commit/run.md) | 1 |
| 20261102-e2e-chrome-docker-sprints-1-4 | [run.md](20261102-e2e-chrome-docker-sprints-1-4/run.md) | 25 |
| 20261105-1728-1132f12-sprint05-fixes | [run.md](20261105-1728-1132f12-sprint05-fixes/run.md) | 7 |
| 20261105-173257-1132f12-sprint05-fixes-retry | [run.md](20261105-173257-1132f12-sprint05-fixes-retry/run.md) | 2 |
| 20261105-1745-1132f12-sprint05-fixes-final | [run.md](20261105-1745-1132f12-sprint05-fixes-final/run.md) | 11 |
| 20261105-181854-1132f12-sprint05-remediation | [run.md](20261105-181854-1132f12-sprint05-remediation/run.md) | 89 |
| 20261105-212738-1132f12-sprint05-qa-independent | [run.md](20261105-212738-1132f12-sprint05-qa-independent/run.md), [sprint05-criteria.md](20261105-212738-1132f12-sprint05-qa-independent/sprint05-criteria.md) | 25 |
| 20261105-213606-1132f12-sprint05-qa-browser-extended | [run.md](20261105-213606-1132f12-sprint05-qa-browser-extended/run.md) | 19 |
| 20261105-213954-1132f12-sprint05-qa-b09-retest | [run.md](20261105-213954-1132f12-sprint05-qa-b09-retest/run.md) | 25 |
| 20261105-214648-1132f12-sprint05-qa-pos-tab-final | [run.md](20261105-214648-1132f12-sprint05-qa-pos-tab-final/run.md) | 27 |
| 20261106-164335-91cf4a1-pb07-tdd-red | [run.md](20261106-164335-91cf4a1-pb07-tdd-red/run.md) | 2 |
| 20261106-164601-91cf4a1-pb07-tdd-red-sandbox | [run.md](20261106-164601-91cf4a1-pb07-tdd-red-sandbox/run.md) | 3 |
| 20261106-165414-91cf4a1-pb07-backend-green-check | [run.md](20261106-165414-91cf4a1-pb07-backend-green-check/run.md) | 3 |
| 20261106-170041-91cf4a1-pb07-backend-regression | [run.md](20261106-170041-91cf4a1-pb07-backend-regression/run.md) | 8 |
| 20261106-174110-91cf4a1-pb07-review1-green | [run.md](20261106-174110-91cf4a1-pb07-review1-green/run.md) | 3 |
| 20261106-174949-91cf4a1-pb07-ui-review2 | [run.md](20261106-174949-91cf4a1-pb07-ui-review2/run.md) | 3 |
| 20261106-175111-91cf4a1-pb07-qa | [matrix.md](20261106-175111-91cf4a1-pb07-qa/matrix.md), [report.md](20261106-175111-91cf4a1-pb07-qa/report.md), [run.md](20261106-175111-91cf4a1-pb07-qa/run.md) | 104 |
| 20261107-001400-91cf4a1-sprint06-qa | [matrix.md](20261107-001400-91cf4a1-sprint06-qa/matrix.md), [report.md](20261107-001400-91cf4a1-sprint06-qa/report.md), [run.md](20261107-001400-91cf4a1-sprint06-qa/run.md) | 247 |
| 20261107-185300-5ada010f-s7-main-smoke | [run.md](20261107-185300-5ada010f-s7-main-smoke/run.md) | 24 |
| 20261107-185632-5ada010f-s7-task-qa | [matrix.md](20261107-185632-5ada010f-s7-task-qa/matrix.md) | 8 |
| 20261107-190000-5ada010f-s7-main-regression | [run.md](20261107-190000-5ada010f-s7-main-regression/run.md) | 3 |
| 20261107-195508-5ada010f-s7-task-qa-retry | [matrix.md](20261107-195508-5ada010f-s7-task-qa-retry/matrix.md), [run.md](20261107-195508-5ada010f-s7-task-qa-retry/run.md), [supplement/matrix.md](20261107-195508-5ada010f-s7-task-qa-retry/supplement/matrix.md) | 141 |
| 20261107-204250-5ada010f-s7-sprint-qa | [matrix.md](20261107-204250-5ada010f-s7-sprint-qa/matrix.md), [run.md](20261107-204250-5ada010f-s7-sprint-qa/run.md), [supplement/matrix.md](20261107-204250-5ada010f-s7-sprint-qa/supplement/matrix.md), +1 | 200 |
| 20261107-sprint07-backend-check | [run.md](20261107-sprint07-backend-check/run.md) | 15 |
| 20261107-sprint07-inventory-red | [run.md](20261107-sprint07-inventory-red/run.md) | 2 |
| 20261107-sprint07-schema-green | [run.md](20261107-sprint07-schema-green/run.md) | 2 |
| 20261109-160831-48ed476-s8-verify-ac | - | 71 |
| 20261109-173135-48ed476-s8-verify-ac-r2 | - | 27 |
| 20261109-180900-48ed476-s8-verify-ac-r3 | - | 21 |
| 20261109-211627-48ed476-s8-verify-ac-r8 | - | 43 |
| 20261109-fix-v1-1 | - | 9 |
| 20261109-fix-v2-2 | - | 11 |
| 20261109-fix-v3 | - | 24 |
| 20261109-review-r1-1 | - | 13 |
| 20261109-review-r1-1-ui | - | 6 |
| 20261109-review-r1-2 | - | 9 |
| 20261109-review-r2-1 | - | 28 |
| 20261109-review-r3-1 | - | 4 |
| 20261109-st1-bank-account-limit | - | 17 |
| 20261109-st1-payment-migration | - | 23 |
| 20261109-st2-payment-promo | - | 18 |
| 20261109-st3-zero | - | 18 |
| 20261109-st4-cash | - | 18 |
| 20261109-st5-bank-qr | - | 38 |
| 20261109-st6-delta | - | 29 |
| 20261109-st6-sepay-webhook | - | 28 |
| 20261109-st7-manual-transfer | - | 29 |
| 20261109-st8-payment-ui | - | 34 |
| 20261109-verify-ac-r6 | - | 9 |
| 20261109-verify-ac-r7 | - | 44 |
| 20261109-verify-ac-r8 | - | 40 |
| 20261109-verify-r4-ac-verifier | - | 13 |
| 20261109-verify-v3-recheck-independent | - | 13 |
| 20261110-110814-48ed476-s8-verify-ac-r9 | - | 17 |
| 20261110-110834-48ed476-s8-verify-ac-r9 | - | 25 |
| 20261110-121132-48ed476-s8-verify-ac-r10 | - | 22 |
| 20261110-121158-48ed476-s8-verify-ac-r10 | - | 187 |
| 20261110-175849-48ed476-v1-4-user-test | - | 15 |
| 20261110-182650-48ed476-payment-ui-after | - | 18 |
| 20261110-review-r14-1 | - | 11 |
| 20261111-002226-48ed476-s8-verify-ac-r11 | - | 130 |
| 20261111-122641-48ed476-s8-verify-ac-r16 | - | 140 |
| 20261111-184300-48ed476-s8-verify-ac-r14-audit | - | 12 |
| 20261111-185503-48ed476-s8-verify-ac-r15 | - | 77 |
| 20261111-194533-48ed476-s8-verify-ac-r17 | - | 78 |
| 20261111-review-r14-main | - | 11 |
