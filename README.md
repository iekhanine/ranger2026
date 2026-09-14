# RANGER 2026 — Graffiti Wall

A one-off digital birthday tag wall for:

**https://ranger2026.ivansays.com**

## Stack

- Vite
- React + TypeScript
- Supabase
- Vercel

It is intentionally isolated from the rest of OneTime Labs / IvanSays data by using its own tables and Storage bucket inside the same Supabase project.

## 1. Create the local project

Extract this folder to:

```text
C:\Projects\BIRTHDAYRANGER
```

Then:

```powershell
npm install
```

## 2. Supabase

Open your existing Supabase project's SQL Editor and run:

```text
sql\001_ranger2026.sql
```

This creates:

- `ranger2026_tags`
- `ranger2026_admins`
- `ranger2026-media` Storage bucket
- RLS policies for public posting and admin moderation

## 3. Environment

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

If you are using the same Supabase project as the OneTime Labs Store, these are the same **public/publishable** values.

Do not put the Supabase service-role key in this project.

## 4. Run locally

```powershell
npm run dev
```

Vite will normally start at:

```text
http://localhost:5173
```

## 5. Admin

The hidden moderation page is:

```text
/admin
```

It uses Supabase passwordless email sign-in.

After signing in once, find your auth user UUID in Supabase Authentication and run:

```sql
insert into public.ranger2026_admins(auth_user_id)
values ('YOUR-AUTH-USER-UUID');
```

Then `/admin` can remove wall posts.

## 6. Deploy

Push to GitHub or deploy the folder directly to Vercel.

After deployment, add:

```text
ranger2026.ivansays.com
```

to the Vercel project and create the DNS record Vercel tells you to create.

Also add the final URL to Supabase Authentication redirect URLs:

```text
https://ranger2026.ivansays.com/admin
```

## Behavior

- No account required to tag the wall.
- Name/handle required.
- Message required.
- Optional photo/GIF upload.
- Images are limited to 8 MB and JPEG/PNG/WebP/GIF through the Storage bucket.
- Public wall refreshes every 15 seconds.
- Posts get rotating visual treatments so it looks like a real wall rather than a guestbook.
- `/admin` is the moderation surface.


## v1.1 graffiti redesign

The public wall is intentionally not a guestbook grid.

Each message is rendered directly onto a reusable brick-wall image with a deterministic mix of graffiti treatments:

- wildstyle
- fast handstyle
- bubble / throw-up
- stencil
- marker
- spray paint
- chalk / paint pen

Photos and GIFs render as taped/pasted Polaroid-style media on the wall.

Local visual image assets live in `public/`:

- `wall-texture.svg`
- `spray-swoop.svg`
- `paint-drips.svg`

The text itself remains real HTML text for accessibility and responsiveness; CSS graffiti fonts, outlines, strokes, shadows, rotation, and paint effects make the posts look tagged rather than turning every post into a flat image.

## Hidden moderation hotspot

The public wall also has an invisible 72×72 clickable hotspot in the bottom-left
corner. It opens a credential-gated moderation panel with post deletion.

Before deploying this version, run:

```text
sql/002_hidden_admin_credentials.sql
```

The shared credentials configured by that migration are:

```text
username: ranger
password: ranger2026
```

The password check and privileged delete happen in Supabase through
`SECURITY DEFINER` RPC functions. Do **not** replace this with a service-role key
in the Vite client. The shared password is suitable for this private birthday-wall
control, but it should not be treated as high-security authentication.

## Long-post + mobile fit update

- Long messages automatically reduce their graffiti font size based on content length.
- A runtime fit pass measures each rendered post and continues shrinking text until it fits its tag box.
- Focused/enlarged posts are constrained to the current viewport and auto-fit instead of forcing giant 72px text.
- On screens 700px wide or smaller, Leave Your Mark starts collapsed and the composer/focus/admin/export controls use mobile-sized layouts.
