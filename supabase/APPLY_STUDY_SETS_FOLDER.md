# Apply study_sets folder_id migration

The app expects a `folder_id` column on `study_sets`. If you see:

**"Could not find the 'folder_id' column of 'study_sets' in the schema cache"**

run the migration once against your Supabase database:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Paste and run the contents of `migrations/20250312000000_study_sets_folder_delink_course.sql`.

If you use `supabase link` and `supabase db push`, you can instead run from the repo:

```bash
npx supabase db push
```
