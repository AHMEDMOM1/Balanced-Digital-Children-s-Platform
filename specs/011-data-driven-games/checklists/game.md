# Game Requirements Checklist: Data-Driven Games

**Purpose**: Validate UX/interaction requirements and data contract requirements for both game types at PR review depth. "Unit tests for the requirements writing" — each item asks whether the spec is complete, clear, and consistent.
**Created**: 2026-06-10
**Feature**: [spec.md](../spec.md)
**Scope**: Both domains — UX/interaction + data contract (config_json schema). Rollback items excluded (covered in quickstart.md).

---

## Requirement Completeness — Interaction States

- [x] CHK001 Is the input-locked-during-feedback state defined — specifically, is there a requirement that a child cannot tap a second choice while the correct/wrong answer animation is showing? [Completeness, Gap, Spec §FR-005]
  <!-- Fixed: FR-005 now includes "While answer feedback is animating, additional choice taps MUST be ignored." -->

- [x] CHK002 Are requirements defined for what happens when a child taps an image card in the matching game BEFORE selecting any label? [Completeness, Gap, Spec §FR-007]
  <!-- Fixed: FR-007 now includes "Tapping an image card when no label is currently selected MUST be a no-op." -->

- [x] CHK003 Are requirements defined for an empty `choices` array in a counting game config (as distinct from the single-item degenerate case mentioned in Edge Cases)? [Completeness, Gap, Spec §Edge Cases]
  <!-- Fixed: Edge Cases now states empty choices → fallback error state (FR-009). Also added to FR-009 explicitly. -->

- [x] CHK004 Are requirements explicitly specified for the star count earned on a matching game win screen? [Completeness, Gap, Spec §FR-008]
  <!-- Fixed: FR-008 now reads "the win screen MUST appear with 1 star earned". -->

- [x] CHK005 Are requirements defined for mid-session navigation — i.e., what happens when a child taps the home/back button while the game is in progress (before winning)? [Completeness, Gap]
  <!-- Fixed: Edge Cases now states "All in-progress game state is silently discarded; no confirmation prompt is shown." -->

---

## Requirement Clarity — Ambiguous Terms

- [x] CHK006 Is "brief visual error indication" in FR-007 quantified with a specific duration? [Clarity, Ambiguity, Spec §FR-007]
  <!-- Fixed: FR-007 now reads "600 ms visual error indication". -->

- [x] CHK007 Is "pixel-equivalent" in SC-006 defined with a verifiable test method, or should it be restated as "visually consistent"? [Clarity, Measurability, Spec §SC-006]
  <!-- Fixed: SC-006 now reads "visually consistent with the existing counting game design (verified via code inspection and manual review)". -->

- [x] CHK008 Is there a requirement for what the game screen should display when `config_json.image_url` (counting) or a pair `image` URL (matching) is unreachable or returns an error? [Clarity, Gap, Spec §FR-004, §FR-006]
  <!-- Fixed: Edge Cases now states "The Image component renders an empty space (standard React Native behaviour); no additional error state is required at this layer." -->

- [x] CHK009 Is there a contradiction between FR-005's use of "immediately transition to the win screen" and the 800 ms animation delay used in plan.md and tasks.md? [Clarity, Consistency, Spec §FR-005]
  <!-- Fixed: FR-005 now reads "MUST transition to the win screen after the correct-answer feedback animation". SC-001 and the Clarifications Q1 bullet also updated for consistency. -->

---

## Requirement Consistency

- [x] CHK010 Is the star count on the matching game win screen consistent with the counting game win screen? [Consistency, Spec §FR-005, §FR-008]
  <!-- Fixed: both FR-005 and FR-008 now specify "1 star earned". -->

- [x] CHK011 Is the requirement that counting and matching games share the same win screen stated explicitly rather than implied? [Consistency, Spec §FR-010]
  <!-- FR-010: "The matching game uses the same background and win screen." Explicit. ✓ -->

- [x] CHK012 Is the absence of error-handling requirements for the `logGameActivity` call (FR-012) explicitly documented as intentional (fire-and-forget)? [Consistency, Assumption, Spec §FR-012]
  <!-- Fixed: FR-012 now reads "The call is fire-and-forget (no error handling or retry is required)." -->

- [x] CHK013 Is the `logGameActivity` call defined for the case when `childData` is null or the auth state is not yet loaded at win time? [Consistency, Gap, Spec §FR-012]
  <!-- Fixed: FR-012 now reads "If childData is null at win time, the call is silently skipped." -->

---

## Acceptance Criteria Quality

- [x] CHK014 Is SC-001 ("zero hardcoded game values remain in the component") measurable at code review time? [Measurability, Spec §SC-001]
  <!-- SC-001 is verifiable via source code inspection — a reviewer can confirm no literal question strings, emoji items, or choice arrays appear in the component. Testable. ✓ -->

- [x] CHK015 Is SC-004 ("loading indicator visible within 100 ms of mount") verifiable by an automated test, or does it require manual device timing measurement? [Measurability, Spec §SC-004]
  <!-- Fixed: SC-004 now explicitly states "Loading indicator *presence* is verified by unit test; the 100 ms timing threshold is verified manually on device." -->

- [x] CHK016 Is SC-007 ("win logged via activity logger for both game types") verifiable via unit test mock assertions without requiring DB access? [Measurability, Spec §SC-007]
  <!-- Yes — tasks.md T002 mocks logGameActivity and asserts it was called. ✓ -->

- [x] CHK017 Are all 7 Success Criteria (SC-001–SC-007) traceable to at least one Functional Requirement? [Traceability, Spec §Success Criteria]
  <!-- SC-001→FR-011, SC-002→FR-006–008, SC-003→US3, SC-004→FR-002, SC-005→FR-003+FR-009, SC-006→FR-010, SC-007→FR-012. All traceable. ✓ -->

---

## Edge Case Coverage

- [x] CHK018 Are requirements defined for a counting game config where `correct_answer` does not appear in the `choices` array? [Coverage, Edge Case, Gap]
  <!-- Fixed: Edge Cases now states "The game renders normally but no tap can produce a win — this is a data-integrity issue and is not guarded at the game screen layer." -->

- [x] CHK019 Are requirements defined for the all-pairs-matched → win transition in the matching game (i.e., what happens immediately after the last pair is matched)? [Coverage, Spec §FR-008]
  <!-- FR-008: "when all pairs have been matched, the win screen MUST appear." Clear and complete. ✓ -->

- [x] CHK020 Are requirements defined for a matching game config with a very large number of pairs that exceeds the visible viewport? [Coverage, Gap, Spec §FR-006]
  <!-- Fixed: Edge Cases now states "All pairs are rendered; the user may scroll. No maximum pair count or pagination is enforced at this layer." -->

- [x] CHK021 Are requirements defined for a non-null `config_json` that is structurally valid JSON but missing required keys for its `game_type`? [Coverage, Edge Case, Gap, Spec §Edge Cases]
  <!-- Fixed: FR-009 now explicitly covers "config_json structurally invalid for its game_type (e.g., required keys missing)" → fallback error state. -->

---

## Non-Functional Requirements

- [x] CHK022 Are accessibility requirements defined for image-based content in both game types (e.g., screen reader labels for the counting image, alt text for pair images)? [Coverage, Gap]
  <!-- Fixed: FR-013 added — counting game image uses question text as accessibilityLabel; matching pair images use the pair's item value. -->

---

## Notes

- **22/22 items passing** — all gaps resolved (2026-06-10).
- Resolved in two passes: CHK004, CHK006, CHK007, CHK009, CHK010, CHK015 via /speckit-analyze; CHK001, CHK002, CHK003, CHK005, CHK008, CHK012, CHK013, CHK018, CHK020, CHK021, CHK022 via checklist completion pass.
