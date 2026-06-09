# Phase 1: Data Model

## Entities

### `child_profiles`
- `id`: UUID (Primary Key)
- `family_id`: UUID (Foreign Key to parent)
- `name`: String
- `age_group`: String

### `parent_profiles`
- `id`: UUID (Primary Key)
- `email`: String

### Content (`stories`, `games`, `videos`, `creative_activities`)
- `id`: UUID (Primary Key)
- `title`: String
- `category`: String (e.g., 'Action', 'Education')
- `age_group_target`: String
- `url`: String (content link)
- `thumbnail_url`: String

### `allowed_categories`
- `id`: UUID (Primary Key)
- `child_id`: UUID (Foreign Key)
- `category`: String
- `is_allowed`: Boolean

## Row-Level Security (RLS) Rules
- Parents can only select and modify `child_profiles` and `allowed_categories` where `family_id` matches their own `auth.uid()`.
- Children can only read from Content tables where the `category` is permitted in their `allowed_categories`.
