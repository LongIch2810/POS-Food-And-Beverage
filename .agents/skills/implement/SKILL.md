---
name: implement
description: Implement a POS task from an approved plan through TDD, code review, and QA. Use after the plan is approved; use create-pos-spec for specifications and do not use this skill to write specs or plans.
---

# Implement

Use this skill only for a task covered by an approved plan in `plans/active/`. Follow `AGENTS.md`, relevant `rules/` (especially `testing.md` and `git.md`), the finalized spec in `specs/`, the approved plan, and its sprint. Do not change a spec or plan. If either is wrong, incomplete, or conflicts with the sprint criteria, stop and report to the user/agent principal.

## 0. Prepare before coding

1. Confirm the plan is approved and the related spec is finalized. If not, stop; route specification work to `create-pos-spec` and planning to the planning workflow.
2. Read the relevant active task/plan, `MEMORY.md` headings and applicable sections, relevant `errors/` when symptoms or modules match, and the linked sprint criteria.
3. Create or update the task file in `tasks/active/` following `AGENTS.md`. Record the branch, HEAD, and exact `git status --short` as the baseline. The working tree may already be dirty: preserve all unrelated edits and untracked files; do not restore or overwrite them.
4. Collect task acceptance criteria from the plan, spec, or existing task, in priority order: plan → spec → task. Copy them into the task before coding:

   | AC | Nội dung | Nguồn | BR | Tiêu chí sprint (mã + nguồn) | Cách chứng minh |
   | --- | --- | --- | --- | --- | --- |

   Assign `AC-1`, `AC-2`, etc. Do not infer criteria from code or diff. Record who changed a criterion, when, and why if the table changes after this point. If none of the three sources gives testable task criteria, stop and request them.
5. Identify the sprint and map each task AC to its sprint criterion. If the task has no linked sprint criterion, or task and sprint criteria conflict, stop and ask the agent principal to decide. Do not choose an interpretation or invent a link.
6. Before integration tests, verify without printing it that `DATABASE_URL` points to local/test PostgreSQL from `POS_INFRA`. Backend integration suites create randomly named databases and drop them after the suite. If the host cannot be confirmed as local/test, mark the run `BLOCKED` and do not run it.

## 1. TDD — main agent

- Follow `rules/testing.md`: tests identify applicable BR codes, state setup/action/expected result, and cover behavior at the lowest level that catches the risk. Use database integration tests for database/transaction behavior. A bug fix needs a test that reproduces the bug.
- Write the failing test first, implement the smallest complete change, then run configured commands from the relevant package: `npm test` in `POS_API/` and/or `POS_UI/`. Do not invent test commands. Record exact commands and original output in `qa-evidence/` as required by `AGENTS.md`.
- Proceed to review only when relevant tests pass. If environment prevents a run, record the blocker and stop; do not report a pass.

## 2. Code review

- Call the `code-reviewer` subagent with a clean task context containing the finalized spec, approved plan, AC table, and diff limited to task files. The reviewer is read-only and may inspect related code/callers/tests as its instructions require.
- Fix findings within scope, return to TDD, and request review of the new diff. Record out-of-scope findings in the task without expanding scope.
- Limit to three review rounds. If the same issue recurs twice, stop and report.

## 3. QA

- Call the `qa` subagent with the AC table (sources and sprint mappings included), current SHA, and working-tree status. QA must execute and collect its own evidence; do not use another agent's report as proof.
- QA reports each scenario with exactly one status: `PASS | FAIL | BLOCKED | NOT VERIFIED`. Each conclusion cites the task AC code, criterion source, BR code if applicable, and evidence path in `qa-evidence/<YYYYMMDD-HHMMSS>-<sha>-<task>/`.
- For a task-level QA run, evaluate PASS only against task acceptance criteria. Record sprint criterion code/source for traceability when mapped, but do not report sprint PASS; that requires an explicit sprint-level QA task.
- Process each status as follows:
  - **FAIL — behavior is wrong:** the main agent independently reproduces using QA's steps; do not rely only on the QA report. If reproduced, create/update `errors/YYYY-MM-DD-ten-ngan.md` following `AGENTS.md`: status, task, symptom, reproduction steps, cause, fix, verification, and evidence references. Record only a cause confirmed by test or log. If unconfirmed, write `Chưa xác minh`; any theory must be labeled `Giả thuyết (chưa xác minh)`. After fixing and verifying, update the cause to `Đã xác minh` and cite the test/log. Then return to TDD, review the new diff, and ask QA to rerun previously failing ACs plus related-flow regression.
    - If the main agent cannot reproduce, do not create an `errors/` record. Record attempted steps, environment, and result in the task; ask QA for reproduction steps or artifacts and rerun. If still not reproducible after more than two attempts, stop and report in the session.
  - **NOT VERIFIED — evidence is missing:** do not create an `errors/` record. Identify and collect the missing artifact, then ask QA to reassess. If the same AC remains unsupported after more than two evidence collection attempts, stop and report.
  - **BLOCKED — environment prevents execution:** do not create an `errors/` record. Record the reason and stop with a report.
- Limit to three QA rounds that require code changes. A report must state work done, blocker, evidence, and proposed next step.

## Stop conditions

Stop and record the current state in the task when any of these occurs:

- Review or QA round limit is reached without completion.
- The same failure recurs twice.
- The plan/spec is suspected to be wrong, incomplete, or conflicting with sprint criteria.
- Sprint criteria are missing or conflict with task criteria; ask the agent principal to decide.
- The test database cannot be confirmed safe.

Report in the session and task: completed work, current state, exact blocker, evidence paths, and concrete next step. Do not present unresolved or unverified criteria as passed.

## Complete

- Update the task with each AC's final status, evidence links, errors links when applicable, changed files, commands and results.
- Move the task and plan to `completed/` only when every task AC is `PASS`. Otherwise leave them in `active/` and write `Báo cáo lại: còn N lỗi, chờ quyết định` with the actual remaining count/state.
- Do not close the sprint. Do not commit or push unless requested, following `rules/git.md`.
