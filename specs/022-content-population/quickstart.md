# Quickstart: Content Population

This guide outlines how to execute the database seed and verify the frontend features.

## 1. Database Seeding

The core database migration script has been updated. To populate the content:

1. Locate the file: `supabase/migrations/20260705000001_seed_all_content.sql`
2. Open the **Supabase Dashboard** for your project.
3. Navigate to the **SQL Editor**.
4. Paste the entire contents of the `.sql` file and execute it.
5. Verify that exactly 33 rows exist in the `content_items` table.

*(Note: The script is idempotent and uses `ON CONFLICT DO NOTHING`, so running it multiple times is safe.)*

## 2. Frontend Development

After the SQL is applied, start the Expo development server:

```bash
npx expo start --clear
```

*(The `--clear` flag ensures any previous API responses cached by Expo/React Query are cleared).*

## 3. Verification

Navigate through the child interface to verify:

- **Stories**: Tap on any story in the library. Ensure it displays Arabic text correctly, and that you can page through the paragraphs.
- **Videos**: Tap on a video. The YouTube player should load and play correctly.
- **Games**: Open a game categorized as "Math" (like Number Sorting) or "Science" (like the Quiz) to test the new engines.
- **Creative**: Tap on a creative activity. It should open a detail screen showing instructions and an image.
