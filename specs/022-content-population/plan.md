# Implementation Plan: Content Population

**Branch**: `022-content-population` | **Date**: 2026-07-04 | **Spec**: [spec.md](file:///C:/Prog/Language/ReactNative/Balanced-Digital-Children-s-Platform/specs/022-content-population/spec.md)

**Input**: Feature specification from `/specs/022-content-population/spec.md`

## Summary

Populate the database with 33 core educational items (Stories, Videos, Games, Activities) with Arabic text, and upgrade the frontend screens to render them fully: Story viewer refactored for pagination and BiDi, Video player embedded with YouTube iframe, new Sorting and Quiz game engines, and a unified Creative details view.

## Technical Context

**Language/Version**: TypeScript 5, React Native (Expo)

**Primary Dependencies**: `react-native-youtube-iframe`, `react-native-reanimated`, `@expo/vector-icons`

**Storage**: Supabase PostgreSQL (`content_items` table)

**Testing**: React Native testing library, Expo dev client

**Target Platform**: iOS/Android/Web via Expo

**Project Type**: Mobile Application

**Performance Goals**: Videos load within 2 seconds, UI stays at 60fps during game interactions

**Constraints**: Embedded YouTube videos require internet access

**Scale/Scope**: 33 initial content items across 4 main content types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Test-First**: Unit tests must be written if any pure logic is added. (Passed)
- **Library-First Architecture**: Changes localized to `app/(child)/*` screens and `scripts/generate-sql.js`. (Passed)
- **CLI & Script Interface**: SQL generator is a node script executable via CLI. (Passed)
- **API Hook Pattern**: Leveraging existing `useStory`, `useVideos`, `useGame` hooks in `services/api/hooks.ts`. (Passed)

## Project Structure

### Documentation (this feature)

```text
specs/022-content-population/
├── plan.md              
├── research.md          
├── data-model.md        
└── quickstart.md        
```

### Source Code (repository root)

```text
scripts/
└── generate-sql.js

supabase/
└── migrations/
    └── 20260705000001_seed_all_content.sql

app/(child)/
├── story/[id].tsx
├── video/[id].tsx
├── game/[id].tsx
├── creative.tsx
└── creative-detail.tsx
```

**Structure Decision**: The frontend code will modify existing screens inside `app/(child)` to support the dynamic content types. The DB seed uses the standard Supabase migrations folder.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
