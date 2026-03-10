# Create drill tables in Supabase

If you see **"Could not find the table 'public.set_questions' in the schema cache"**, run the SQL below once in the Supabase Dashboard → **SQL Editor**.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Paste and run the contents of **`migrations/20250311000000_drill_sets_and_questions.sql`** (or the SQL below).

If the `study_sets_type_check` constraint already exists with the new values, you may see an error on that line; in that case run only the `CREATE TABLE` and following statements.
