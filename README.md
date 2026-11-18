# StreamGap MVP

StreamGap is a no-signup generator for Twitch streamer downtime: ad breaks, loading screens, matchmaking queues, technical issues, guest transitions, and quiet chat.

It generates:

- An opening line
- Three audience prompts
- A poll
- A mini-game
- A return transition
- Chatbot-ready text
- A safety note
- Copyable and downloadable output

StreamGap is unofficial and is not affiliated with, endorsed by, or sponsored by Twitch.

## Deployment architecture

The static frontend is GitHub Pages-compatible.

GitHub Pages cannot execute `api/generate.js`. The API must be deployed separately as a Vercel serverless function. The browser uses one configurable API URL:

```js
var API_URL = typeof window.API_URL === "string" && window.API_URL.trim()
  ? window.API_URL.trim()
  : "https://streamgap-api.vercel.app/api/generate";
```

For a real deployment, replace the default API URL with the deployed Vercel function URL or define `window.API_URL` before loading `js/app.js`.

The current production site URL used by SEO metadata is:

```text
https://caytec.github.io/streamgap-mvp-20261118/
```

## Local development

The project has no npm runtime dependencies.

Install Vercel CLI if it is not already available:

```bash
npm install --global vercel
```

Run the Vercel project locally:

```bash
npm start
```

The browser fallback works without an AI key. A separate API deployment is required for provider-backed generation.

## Vercel API environment variables

Use only these environment variables:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=
GROQ_API_KEY=
ALLOWED_ORIGINS=https://caytec.github.io
```

Allowed `AI_PROVIDER` values are `gemini` and `groq`.

Configure secrets in Vercel Project Settings. Do not put API keys in HTML, browser JavaScript, GitHub Pages settings, or public build files.

`ALLOWED_ORIGINS` is a comma-separated list of exact origins. For the Pages site above, the origin is:

```text
https://caytec.github.io
```

Do not include the repository path in the origin.

## GitHub Pages

Publish the repository root as the Pages artifact. Keep these files in the published output:

- `index.html`
- `privacy.html`
- `terms.html`
- `css/styles.css`
- `js/app.js`
- `og.svg`
- `robots.txt`
- `sitemap.xml`
- `.nojekyll`

The frontend intentionally uses relative asset paths so it works from the project subpath.

## Security and privacy

- Provider keys remain server-side.
- The API validates content type, body size, input fields, provider output, and unsafe patterns.
- The API has best-effort in-memory rate limiting.
- Serverless in-memory rate limiting is not globally durable. For higher traffic, use a durable provider such as Vercel WAF or an external rate-limit service.
- Do not enter personal, confidential, or sensitive information.
- Generated output must be reviewed and moderated before being used live.

## Browser requirements

Clipboard and Web Share features work best over HTTPS. `localhost` is generally accepted as a secure development context.

The app includes a textarea copy fallback for browsers where the Clipboard API is unavailable. Share cancellation is handled without an unhandled promise rejection.

## Verification checklist

Before launch:

- Confirm the Vercel API URL in `js/app.js`.
- Configure `ALLOWED_ORIGINS` with the exact production browser origin.
- Verify `POST` and `OPTIONS` API requests.
- Verify incorrect content types return `415`.
- Verify invalid methods return `405` with `Allow`.
- Verify provider keys never appear in static files.
- Test copy and download on Safari and mobile Safari.
- Validate canonical URLs, Open Graph metadata, `robots.txt`, and `sitemap.xml`.
- Run accessibility checks for keyboard navigation, focus, contrast, reduced motion, and responsive layouts.
