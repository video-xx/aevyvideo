Aevy Developer Workspace
========================

Aevy is a community workspace for discovering, publishing and organizing reusable scripts. The public site is a static HTML/CSS/JavaScript app; Supabase provides accounts, profiles, script metadata, source files, reviews, likes and realtime updates.

Features
--------
- Search and browse public scripts by language, popularity and update date.
- Publish code snippets and source files, with public or private visibility.
- Inspect highlighted source, copy code, download files, fork scripts and leave comments/reviews.
- Manage personal files, create ZIP backups and restore script backups.
- Use profiles, follows, messages and the optional Aevy AI assistant.

Setup
-----
1. Configure the Supabase project URL and publishable key in js/config.js.
2. In Supabase SQL Editor, run supabase/schema.sql to create the tables, policies, storage and functions.
3. Enable Email authentication and set the deployed URL under Authentication > URL Configuration.
4. Serve the project over HTTP(S). For local development, run `npx serve .` or `python -m http.server 8080` from this folder.
5. Push the project to GitHub. Cloudflare Pages can deploy the repository as a static site with no build command and the repository root as the output directory.

Security
--------
The Supabase publishable key is intended to be public. Row Level Security in supabase/schema.sql protects data. Never place a Supabase service_role key or other secret in browser code.

Scripts are community submitted. Review source before running it. Aevy does not guarantee that downloaded code is safe.
