# Requirements Quality Checklist: Realtime, Audit & RTL

**Purpose**: Post-implementation requirements audit gate.
**Created**: 2026-06-08
**Focus**: Realtime Reliability, Audit Logging, and RTL Compliance.

## Requirement Completeness
- [ ] CHK001 Are reconnection retry strategies and backoff intervals explicitly defined? [Gap]
- [ ] CHK002 Does the spec define what happens if the 'realtime_commands' table write fails on the parent device? [Gap]
- [ ] CHK003 Are the exact data fields for the 'activity_logs' table specified for every command type? [Completeness, Spec §FR-005]
- [ ] CHK004 Does the spec define behavior for 'long-offline' scenarios (e.g. child offline for > 30 days)? [Gap, Spec §Edge Cases]

## Requirement Clarity
- [ ] CHK005 Is 'within 2 seconds' quantified with a network latency assumption? [Clarity, Spec §SC-001]
- [ ] CHK006 Is 'graceful timeout message' defined with specific bilingual copy? [Clarity, Spec §US2]
- [ ] CHK007 Are 'bilingual word order' rules explicitly defined for mixed Arabic/English sentences? [Gap, Mandate]
- [ ] CHK008 Is the source of truth for 'Server Timestamp' clearly identified (DB clock vs Edge clock)? [Ambiguity, Spec §Edge Cases]

## Requirement Consistency
- [ ] CHK009 Do the 90-second heartbeat timeout (FR-006) and the 30-second heartbeat interval (FR-004) align with the 'instant' feedback goal? [Consistency]
- [ ] CHK010 Are category naming conventions consistent between UI labels and DB preferences? [Consistency, Spec §US3]

## Acceptance Criteria Quality
- [ ] CHK011 Can 'less than 5% extra battery drain' be objectively verified on mobile devices? [Measurability, Spec §SC-003]
- [ ] CHK012 Is the 'sub-second' response requirement measurable under 3G/LTE conditions? [Measurability, Spec §US1]

## Scenario & Edge Case Coverage
- [ ] CHK013 Are requirements defined for simultaneous conflicting commands from DIFFERENT families (family-ID isolation)? [Coverage, Spec §Edge Cases]
- [ ] CHK014 Does the spec define the behavior if the child app is closed/force-quit when a command arrives? [Gap, Spec §Edge Cases]
- [ ] CHK015 Are RTL layout requirements specified for 'PauseOverlay' when system direction is LTR? [Gap, Mandate]
- [ ] CHK016 Are recovery paths defined for if a child device fails to acknowledge a command after replaying it? [Gap]
