# Aevy video setup

The site keeps its existing Aevy design. Members can upload videos to Cloudflare Stream or share a supported external video link. The Worker creates a one-time Stream upload URL; the browser uploads directly to Stream; the published playback URL is saved in the member's normal Supabase post. Stream and Supabase keys stay on the Worker.

## Enable Cloudflare Stream uploads

1. Enable Cloudflare Stream for your account and create a Cloudflare API token with **Stream: Edit** permission. Stream storage and delivery are billed according to your account plan.
2. Copy your Cloudflare Account ID from the dashboard. From the Supabase project configured in `js/config.js`, copy the project URL and publishable key.
3. In PowerShell, from the `worker` folder, run these commands. Wrangler prompts for each value:

```powershell
npx.cmd wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx.cmd wrangler secret put STREAM_API_TOKEN
npx.cmd wrangler secret put SUPABASE_URL
npx.cmd wrangler secret put SUPABASE_ANON_KEY
npm.cmd run deploy
```

Enter the Cloudflare Account ID, Stream API token, Supabase URL, and Supabase publishable key respectively. The Worker verifies the signed-in Supabase session before it returns a one-time Stream upload URL. Check `<worker-url>/api/health`; `streamConfigured` should be `true`.

The Share video page uploads files directly to Stream and supports files under 200 MB. Cloudflare requires resumable TUS uploads for larger files; this form currently reports that limit. A video uploaded to Stream is then published to the site's feed through the existing Supabase video post.

## Optional external video catalog API

Cloudflare Stream hosts member uploads; it does not provide a public catalog of unrelated videos. To use another catalog API, configure `API_BASE_URL`, `API_LIST_PATH`, and any needed `API_*` mappings in `worker/wrangler.jsonc`. Store a provider key with `npx.cmd wrangler secret put VIDEO_API_KEY`, then redeploy. Never put API keys in GitHub or `js/config.js`.

Presets available in the Worker include `pexels` and `pixabay`; `eporner` is an adult-video API. Leave `API_PRESET` empty for Stream-only uploads and member-shared links. Without a catalog API, search, categories, and pagination use public member posts already loaded by the site.

## Notes

- Provider quotas, Stream billing, and Supabase limits apply; video storage is not unlimited.
- The Worker endpoint requires the user to be signed in. Guests must create or sign into an account before uploading.
- Keep `worker/node_modules/` and `worker/.wrangler/` out of GitHub. `.gitignore` excludes them.
