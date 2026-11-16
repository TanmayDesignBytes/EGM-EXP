# Evidence index

## Requested captures

Four screenshots were saved through isolated, headless Chrome browser captures. The app screenshot uses a fresh temporary browser profile and synthetic tasks created through the actual app form. The report screenshots show the source Markdown files in Chrome’s plain-text file view. No screenshot includes the desktop or the user’s normal Chrome profile. Terminal screenshots could not be captured because Codex’s computer-use controls refused access to Terminal and the available terminal tool has no local screenshot export. A full-desktop capture was rejected by the automatic safety review because it could include unrelated private content.

| # | Requested filename | Status | Capture evidence and limitation |
|---|---|---|---|
| 01 | [`screenshots/01-egm-artifacts.png`](screenshots/01-egm-artifacts.png) | **Captured** | Browser view of the project README showing links to the EGM fundamentals, concepts brief, design, chronology, and review-findings documentation. It is an artifact map, not a file-explorer screenshot. |
| 02 | [`screenshots/02-goldfish-finding.png`](screenshots/02-goldfish-finding.png) | **Captured** | Consolidated review source showing M1 (Major), the Node/Vitest storage-event test gap, and the recommendation for an injected event target/fake. Source: [`consolidated_review_report.md`](../egm/reviews/consolidated_review_report.md#major). |
| 03 | [`screenshots/03-goldfish-resolution.png`](screenshots/03-goldfish-resolution.png) | **Captured** | Final Goldfish report source showing the applied injected event-target boundary and Node fake-target coverage. Source: [`goldfish_review_report.md`](../egm/reviews/goldfish_review_report.md#resolution-result); implementation: [`crossTab.ts`](../../src/persistence/crossTab.ts) and [`crossTab.test.ts`](../../src/persistence/crossTab.test.ts). |
| 04 | [`screenshots/04-task-manager.png`](screenshots/04-task-manager.png) | **Captured** | Isolated Chrome rendering of the actual app after app-form submissions for `Design UI` and dependent `Build UI`; it visibly shows **Blocked** and **Waiting on Design UI**. |
| 05 | `screenshots/05-tests-passed.png` | **BLOCKED — not saved** | Actual run: 4 Vitest files and 19 tests passed. Terminal UI access was unavailable, and command output was not converted into an artificial terminal image. |
| 06 | `screenshots/06-build-audit.png` | **BLOCKED — not saved** | Actual run: TypeScript check and Vite 7.3.7 production build passed; `npm audit` reported zero vulnerabilities. Terminal UI access was unavailable, and command output was not converted into an artificial terminal image. |

The four captured images are linked above. The two blocked entries remain absent. Captures 01–03 are browser screenshots of the actual README/report text, not editor-rendered Markdown. Review images at full size before publication; the raw text view is readable but includes Markdown syntax.

Automated results are documented separately in [Implementation and verification](../egm/implementation-and-verification.md). The limited browser interaction above does not verify all manual scenarios and does not replace automated tests. Do not include real task content, browser profile details, local paths, or developer console values in future captures.
