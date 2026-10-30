# Security headers

`vercel.json` sets a Content-Security-Policy on every response. The goal is to
stop injected script from running on login.dimo.org, where the Turnkey session
key lives in `localStorage`.

## What each directive allows, and why

| Directive | Value | Why |
| --- | --- | --- |
| `script-src` | `'self'` | The protection that matters. The build has no inline scripts, and nothing loads third-party scripts (Sentry's report dialog and session replay are not enabled). Injected `<script>`, inline event handlers and `javascript:` URLs are blocked. |
| `object-src` | `'none'` | No plugins. |
| `base-uri` | `'self'` | Stops an injected `<base>` from redirecting relative script URLs. |
| `form-action` | `'self'` | The app posts no forms elsewhere; OAuth uses redirects. |
| `connect-src` | `'self' https: wss:` | Deliberately broad. API hosts come from `REACT_APP_*` env vars per environment (auth, identity, devices, console API, Turnkey, ZeroDev bundler/paymaster, Polygon RPC, Sentry, IPFS). Listing them would break a deploy whenever one changes. |
| `img-src` | `'self' data: blob: https:` | OEM logos and vehicle images come from various hosts. |
| `style-src` | `'self' 'unsafe-inline'` | Libraries inject `<style>` at runtime. Styles can't run script. |
| `font-src` | `'self' data:` | Our fonts are bundled. |
| `frame-ancestors` | not set | Apps may embed login.dimo.org in an iframe (`isEmbed`), and which app is only known at runtime. Instead, an embedded login checks the embedding page's origin (`getEmbedderOrigin`: `location.ancestorOrigins`, else `document.referrer`) against the redirect URI's origin and shows an error otherwise, so another site can't frame it and trick clicks onto Share, Approve or Sign. When the browser doesn't say who embeds it, it refuses. |

## Changing it

- Adding a third-party **script** (analytics, a widget): add its exact origin to
  `script-src`. Don't add `'unsafe-inline'` or `'unsafe-eval'`.
- Enabling Sentry's `showReportDialog` needs the Sentry DSN host in `script-src`.
- Check the browser console on a Vercel preview for `Content-Security-Policy`
  violations before merging. On previews, Vercel's comment toolbar
  (`vercel.live/.../feedback.js`) is blocked; that's expected and doesn't
  affect production.

## Cross-site requests

What the login accepts from other pages, and from whom:

- **Messages** (`DevCredentialsContext.handleAuthInitMessage`) are accepted only from the window that opened or embeds the login. After its `AUTH_INIT`, only from that same origin. Action data (`*_DATA`) answers a request `AUTH_INIT` made and can't change `clientId`, `redirectUri`, `apiKey` or `configCID`.
- **The caller must be the app.** In popup and embed mode, the `AUTH_INIT` origin and the embedding page must be the redirect URI's origin, or the "This page can't open this sign-in" error shows. Tokens, signatures and keys are posted only to that origin. A message that carries one never falls back to the referrer.
- **No stored session is used** (or, embedded, sent) until the request has passed these checks.
- **OAuth returns** (Google, Apple, Tesla) are trusted only when `state.flowRef` names a flow snapshot saved in this tab (`readTrustedOAuthReturn`). Anything else is someone else's link, so its `code` is never exchanged and nothing from its `state` is applied. If storage is blocked, these sign-ins don't start.
- **Every config source** (URL, OAuth state, `configCID`, `configurationId`) goes through the same allowlist (`filterMessageParams`). A `configCID` must be a base32 CIDv1, because it becomes part of a hostname. A `clientId` must be an address before it goes into a query.
- **Redirect mode:** the SDK's `dimoState` nonce is returned with every redirect back, so the app can tell its own returns from a forged link.
- **Provisioning** always asks the user before signing anything; see `developer-license-provisioning.md`.
