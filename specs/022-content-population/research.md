# Research & Decisions: Content Population

## 1. Story Text Pagination

**Decision**: Split `content_text` by double newline `\n\n` to dynamically create story pages.
**Rationale**: It avoids schema migrations (like creating a `story_pages` table) and leverages the existing `content_text` field seamlessly. Standard Arabic story formatting naturally uses paragraphs.
**Alternatives considered**: JSON structure for pages in `config_json`. Rejected because `content_text` is already standard for the `story` type and easier to generate/edit.

## 2. YouTube Video Playback

**Decision**: Use `react-native-youtube-iframe` library.
**Rationale**: It's already in the `package.json`, provides a stable WebView wrapper around the official YouTube iFrame Player API, and supports playback state tracking (e.g. `onChangeState`).
**Alternatives considered**: Extracting direct MP4 streams. Rejected due to YouTube terms of service violations and rapid breakage of extraction logic.

## 3. Game Engine Data Structures

**Decision**: Store level configs in the `config_json` JSONB column.
**Rationale**: Supabase JSONB columns provide maximum flexibility for different game mechanics (e.g., sorting requires different fields than quiz) without altering the table schema.
**Alternatives considered**: Separate tables for each game type. Rejected because it introduces unnecessary relational complexity for simple mini-games.

## 4. BiDi (Bidirectional) Text

**Decision**: Use existing `getBiDiStyle` and `formatBiDiText` utilities.
**Rationale**: The app already contains these utilities for RTL text rendering, ensuring Arabic text starts on the right, even with mixed English words.
**Alternatives considered**: Forcing `writing-direction: rtl` on all text nodes. Rejected because it would incorrectly align pure English screens.
