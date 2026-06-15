# Stage 1 Supabase Verification

Use this after applying `docs/supabase/stage1-auth-ownership.sql` in the Supabase SQL editor and enabling the Google Auth provider.

## SQL Checks

Run these in Supabase SQL editor:

```sql
select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename = 'movemap_projects'
order by policyname;
```

Expected policies:

- `owners can insert projects`
- `owners can read projects`
- `owners can update projects`
- `enabled view links are public`

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'free_cloud_project_limit',
    'enforce_free_project_limit',
    'get_project_by_edit_token',
    'update_project_by_edit_token'
  )
order by routine_name;
```

Expected: all four functions are present.

```sql
select free_cloud_project_limit();
```

Expected: `3`, matching `FREE_CLOUD_PROJECT_LIMIT` in `src/planCapabilities.mjs`.

## Storage Checks

Run this in Supabase SQL editor:

```sql
select id, name, public
from storage.buckets
where id = 'movemap-audio';
```

Expected: one public bucket named `movemap-audio`.

Confirm these storage policies exist on `storage.objects`:

- `authenticated audio upload`
- `anonymous audio read`

Then sign in locally, upload an audio file, and open the saved `publicUrl` in a logged-out/incognito browser. Expected: the file is readable without a Supabase session.

## Google OAuth Smoke

1. In Supabase Authentication > Providers, enable Google.
2. Add local and production redirect URLs in Supabase Authentication > URL Configuration:
   - `http://localhost:5174`
   - `http://127.0.0.1:5174`
   - production `VITE_PUBLIC_SHARE_ORIGIN`
3. In Google Cloud Console, add the same local and production origins to the Web OAuth Client's authorized JavaScript origins.
4. Run `npm run dev`. The local app must stay on the strict `5174` port; if that port is busy, stop the existing server instead of using a different port.
5. Open the app at the same origin configured above and click `Google 로그인`.
6. Complete OAuth and confirm the app returns to Movemap.
7. Create a project, click `저장하기`, and confirm the share panel shows account ownership connected.
8. Sign out and confirm local demo editing still works but cloud save/share prompts login.

## Link Smoke

1. Signed in, create View/Edit links.
2. Open `/share/:id` in an incognito browser. Expected: readonly review, no edit controls.
3. Disable View Link as the owner and reload `/share/:id` incognito. Expected: disabled-link message and no project content.
4. Open `/edit/:id?token=<valid-token>` incognito. Expected: edit controls are available.
5. Open `/edit/:id?token=bad` incognito. Expected: no edit controls; readonly fallback only if View Link is enabled.

## Limit Smoke

Create Free projects until the configured limit is reached. The next insert should fail with `Free project limit reached`.
