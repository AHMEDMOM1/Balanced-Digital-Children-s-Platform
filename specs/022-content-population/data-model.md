# Data Model: Content Population

This project uses the existing `content_items` table in Supabase. No new database tables are created. However, the schema relies heavily on JSON payloads for different content types.

## Entity: `content_items`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `title` | TEXT | Display name (Must be unique for seed idempotency) |
| `type` | TEXT | Enum: `story`, `game`, `video`, `creative` |
| `category` | TEXT | Activity category (e.g., `math`, `science`) |
| `min_age` | INTEGER | Minimum recommended age |
| `max_age` | INTEGER | Maximum recommended age |
| `is_active` | BOOLEAN | Whether content is visible to users |
| `thumbnail_url` | TEXT | URL to image or emoji |
| `url` | TEXT | Used for YouTube Video URLs |
| `duration_seconds` | INTEGER | Length of video/activity |
| `content_text` | TEXT | Multi-paragraph text for stories, or instructions for creative |
| `assets_url` | TEXT | Image asset for creative activities |
| `game_type` | TEXT | Identifies the game engine (e.g., `counting`, `sorting`, `quiz`) |
| `config_json` | JSONB | Engine-specific configuration |

## JSON Schemas for `config_json`

### Sorting Game

```json
{
  "type": "sorting",
  "instruction": "رتّب الأرقام من الأصغر إلى الأكبر",
  "items": [5, 2, 8, 1, 4],
  "correct_order": [1, 2, 4, 5, 8]
}
```

### Quiz Game

```json
{
  "type": "quiz",
  "questions": [
    {
      "question": "ما أقرب كوكب إلى الشمس؟",
      "choices": ["الزهرة", "عطارد", "الأرض", "المريخ"],
      "correct_index": 1
    }
  ]
}
```
