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
| `frame-ancestors` | not set | Apps may embed login.dimo.org in an iframe (`isEmbed`), so any parent must be allowed. |

## Changing it

- Adding a third-party **script** (analytics, a widget): add its exact origin to
  `script-src`. Don't add `'unsafe-inline'` or `'unsafe-eval'`.
- Enabling Sentry's `showReportDialog` needs the Sentry DSN host in `script-src`.
- Check the browser console on a Vercel preview for `Content-Security-Policy`
  violations before merging.
