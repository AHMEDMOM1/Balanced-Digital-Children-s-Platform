# Phase 1: Research & Technical Decisions

## 1. Data Fetching and State Management
- **Decision**: Use Custom React Hooks built on top of `@supabase/supabase-js`.
- **Rationale**: The project requires replacing placeholder hooks with live data hooks. Encapsulating Supabase calls inside these hooks prevents scattering DB logic in UI components.
- **Alternatives considered**: TanStack Query (adds dependency overhead, but good for caching). We'll stick to a simple wrapper over Supabase client for Phase 1 as it meets the <500ms latency requirement.

## 2. Offline Caching Strategy
- **Decision**: Implement a lightweight local cache mechanism (e.g., AsyncStorage or Zustand persist) for the fetched content lists.
- **Rationale**: The spec requires showing cached data if the device is offline or if a database timeout occurs.
- **Alternatives considered**: WatermelonDB (too heavy for a simple cache), Supabase offline sync (not natively supported yet in JS client without extra setup).

## 3. Unified Data Access Layer (API Service)
- **Decision**: Create a `services/api/` module with domain-specific files (`stories.ts`, `games.ts`, etc.).
- **Rationale**: Ensures all data reads/writes go through a unified service, maintaining clean architecture.
