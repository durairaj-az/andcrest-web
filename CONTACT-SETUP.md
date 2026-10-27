# Contact form storage (Cloudflare Worker + KV)

The form posts to `/api/contact`; `worker.js` validates it and saves it in a KV namespace.
Only `/api/*` runs the Worker. Every other URL is served as a static file from `dist/`.

## One-time setup (about 5 minutes)

Run these from this folder. `wrangler` needs a Cloudflare login; Node 18 works with wrangler 3.

```sh
npx wrangler@3 login

# 1. Create the store and copy the id it prints
npx wrangler@3 kv:namespace create SUBMISSIONS

# 2. Paste that id into wrangler.jsonc, replacing REPLACE_WITH_KV_NAMESPACE_ID

# 3. Set the private key used to read submissions (make one with: openssl rand -hex 24)
npx wrangler@3 secret put ADMIN_KEY

# 4. Rebuild dist/ and deploy the site and the Worker together (keeps the name "andcrestweb")
npm run deploy
```

## Reading the messages

Keep the key private. Newest messages come first.

- Table:  `https://andcrestweb.aizentifyadmin.workers.dev/api/submissions?key=YOUR_KEY&format=html`
- JSON:   `.../api/submissions?key=YOUR_KEY`
- XML:    `.../api/submissions?key=YOUR_KEY&format=xml`

A wrong or missing key returns 404, so the endpoint looks like it does not exist.
To change the key, run step 3 again.

## Notes

- Limits built in: 10 KB per request, one message per IP per minute, a hidden spam-trap field,
  and same-site requests only.
- To view or delete entries in the dashboard: Workers & Pages > KV > SUBMISSIONS.
- Uploading a zip in the dashboard cannot include the Worker, so use `npm run deploy` for this site.
- The site is served from `dist/`, which `npm run build` regenerates from the root files. `worker.js` and the config are never public.
