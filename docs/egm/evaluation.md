# Evaluation, limitations, and recommendations

## What this one experiment supports

The recorded work shows that an EGM-style process can structure one project into an explicit brief, a section-approved design, staged fresh-context review, human-selected resolutions, and an implementation that can be checked against those artifacts. Reviewers raised a testability gap and several clarity problems before implementation; the user chose which to resolve. This is evidence that the process surfaced those issues in this case.

It does **not** show that EGM produces better software than ordinary agent coding. There was no control task, direct-coding baseline, blinded comparison, repeated trial, measured defect rate, or matched time/token/cost data. The project cannot support claims that EGM is objectively faster, cheaper, more accurate, or superior.

## Potential benefits observed or plausible

- **Planning:** The brief captured rules before they were scattered across UI handlers and persistence code.
- **Independent challenge:** A reviewer found that a Node test plan lacked a browser-event test seam. Other stages found unclear save states and filter membership.
- **Decision record:** The design records why localStorage, a reducer, pure domain functions, and best-effort conflict awareness were selected.
- **Human checkpoints:** The user narrowed scope, approved sections, retained revision tracking despite a simplicity challenge, and selected the findings to resolve.
- **Implementation traceability:** The 18-file implementation plan maps design responsibilities to source and test files.

These are qualitative observations from this single case, not measured effect sizes.

## Costs and disadvantages

- The workflow uses more turns and review stages than direct implementation of a simple feature.
- Multiple reviewer contexts consume additional model usage; no token or cost totals were captured.
- Human review is still required to distinguish a real defect from a style preference, duplicate suggestion, or false positive.
- Detailed designs and multiple reports create maintenance work. Old reports must remain clearly dated/ordered so the pre-resolution consolidated report is not mistaken for final status.
- A fresh chat context can still be affected by host instructions, shared files, model behavior, or incomplete context. “Fresh” does not mean unbiased or infallible.
- A complete plan can still fail in implementation or browser behavior. Unit tests and manual checks remain necessary.

## Technical and evidence limits

- **One case, no comparison:** no ordinary-coding baseline or repeated samples exist.
- **Incomplete brainstorm provenance:** the concept brief summarizes six concern themes but does not retain individual raw Goldfish returns, reviewer names, or severity.
- **Review isolation:** the consolidated report records the fresh subagent executions and also notes that the host could not prove project instruction files were excluded. Stage 9 lacked the optional Stage 8 report at prompt time.
- **Manual verification:** no complete manual pass, screenshot, or browser interaction log is available. The user-reported prerequisite checkbox observation was not reproduced in an accessible browser.
- **Cross-tab behavior:** localStorage events and compare-before-write reduce silent overwrites when a change is detected, but the comparison/write gap remains non-atomic.
- **Local data:** there is no backend, account, or encryption. Do not store sensitive task content in localStorage.
- **License:** no license file was added because company policy was not confirmed.

## When to use EGM

EGM is more useful when a change has ambiguous requirements, several interacting rules, meaningful failure modes, persistence/schema implications, or decisions that need a durable record. Independent review can be worthwhile when the cost of a missed assumption exceeds the added review time and model usage.

A direct coding flow may be enough for a small, bounded, reversible change with obvious behavior and low coordination cost. The upstream EGM guide itself says to use the right skill for the current bottleneck rather than force every task through the design-first sequence.

## Recommendation from this project

Treat EGM as a review and decision-recording option, not a quality guarantee. For future evaluations, compare matched tasks under direct coding and EGM; record time, token/cost use, accepted/rejected findings, implementation defects, and reviewer false positives; use the same verification criteria; and preserve manual/browser evidence. Until then, present the Task Manager as a documented case study, not proof of superiority.
