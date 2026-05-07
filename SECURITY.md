# Lizard Reviews — Security Audit & Deployment Notes

**Audit date:** 2026-05-07
**Site type:** Static HTML marketing site (no backend, no user auth, no forms)
**Risk profile:** Low — public marketing surface, no PII collected on-site
**Audited files:** `index.html`, `blog/*.html`, `llms.txt`, `robots.txt`, `sitemap.xml`

---

## Executive summary

| Layer | Status | Notes |
|---|---|---|
| HTML / markup | **Hardened** | rel/target attributes on external links, meta security headers added |
| Privacy / GDPR | **Clean** | No analytics, no cookies, no tracking pixels — no consent banner needed |
| External resources | **Acceptable** | Google Fonts (CSS) and Calendly (booking) — both reputable, both behind HTTPS |
| HTTP headers | **Pending** | Must be configured at deployment (Vercel/Cloudflare/server) — see §4 |
| Schema / metadata | **Clean** | No PII leaks beyond intentional public contact email |
| Inline JS / event handlers | **Clean** | Zero inline `onclick`/`onload` — all listeners attached via `addEventListener` |
| Email exposure | **Acceptable risk** | `daniel@lizardreviews.com` published — intentional B2B contact, harvest risk acknowledged |

**Critical issues:** none.
**Recommended fixes pending:** HTTP-level security headers at deploy time (§4).

---

## 1 · What was hardened in HTML

### 1.1 External link tabnabbing protection
Applied `rel="noopener noreferrer" target="_blank"` to **all 14 external Calendly links** across 6 files.

- `noopener` — prevents the destination page from manipulating `window.opener` to redirect the original tab (reverse tabnabbing).
- `noreferrer` — strips the Referer header so the destination doesn't see which exact page the user came from.
- `target="_blank"` — opens in new tab; user retains the booking context after the call is scheduled.

### 1.2 Referrer policy
Added `<meta name="referrer" content="strict-origin-when-cross-origin">` to all 6 HTML files.

- Same-origin requests get full URL.
- Cross-origin requests (to Google Fonts, Calendly, schema validators) get only the origin, not the path.
- Cross-origin downgrade (HTTPS → HTTP) gets nothing.

### 1.3 MIME-sniffing protection
Added `<meta http-equiv="X-Content-Type-Options" content="nosniff">` to all 6 files.

- Prevents the browser from interpreting files as a different MIME type than declared.
- Defense-in-depth; mostly relevant if user-uploaded files were ever served (they're not), but cheap to include.

### 1.4 Inline JS audit
- Zero inline `onclick`, `onload`, `onsubmit`, etc.
- All event handlers attached via `addEventListener` after DOM ready.
- All `<script>` blocks are inline trusted content (no dynamic `eval`, no `innerHTML` injection paths from external sources).

### 1.5 SVG audit
- All SVGs are inline literals (no remote `<image>`/`<use href>` to untrusted sources).
- No `<foreignObject>`, no `<script>` inside SVGs.
- `viewBox`, `fill`, basic attributes only — no `onclick`/`onload` event attributes.

### 1.6 JSON-LD audit
- All structured data (`Organization`, `WebSite`, `BlogPosting`, `FAQPage`, `HowTo`, `BreadcrumbList`) uses correct types.
- No PII leaked beyond `daniel@lizardreviews.com` (intentional public contact).
- Schema claims (1,427 reviews removed, 100% delivery rate) are factual marketing claims — not a security issue, but worth keeping accurate as the site lives.

---

## 2 · Privacy & GDPR posture

### 2.1 Cookies, tracking, analytics
- **None set by the site.**
- No Google Analytics, no Facebook Pixel, no Hotjar, no Sentry, no anything.
- No cookie consent banner needed.

### 2.2 Third-party data flows
| Service | Where it hits | Data sent |
|---|---|---|
| Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) | Initial page load | IP + User-Agent + Referer (referrer policy mitigates the last) |
| Calendly | When user clicks "Book a call" | Standard browsing data once on Calendly's domain — Calendly handles its own GDPR |
| `mailto:daniel@lizardreviews.com` | When user clicks email link | Triggers user's own email client — no data leaves user's device |

### 2.3 GDPR self-host alternative (if needed later)
If German/Austrian/strict-EU regulators flag Google Fonts as a third-party data flow, **self-host the fonts**:
1. Download the woff2 files for Bricolage Grotesque, Fraunces, JetBrains Mono.
2. Serve from `/fonts/` on lizardreviews.com.
3. Replace the `<link href="fonts.googleapis.com">` block with `@font-face` rules.
4. Already has system-font fallbacks — won't break visually if removed.

This is **not required today** but is the cleanest GDPR posture if a German court ever rules against Google Fonts CDN (precedent exists from 2022).

---

## 3 · Email & contact-channel security

### 3.1 Email harvesting risk
`daniel@lizardreviews.com` appears in plain `mailto:` links and footer text. Visible to scrapers.

**Why we accept this risk:**
- It's an intentional B2B contact channel; obscuring it defeats the purpose.
- Inbound email volume is low compared to spam volume, which can be filtered.

**Mitigations available if needed later:**
- Move primary contact to a Calendly form or Cal.com embed (no exposed email).
- Use SPF/DKIM/DMARC on `lizardreviews.com` MX records (mandatory regardless — see §5).
- Route through an alias (`daniel@lizardreviews.com` → real inbox) so the public alias can be rotated if poisoned.

### 3.2 Email infrastructure (DNS / outbound)
**Critical for outbound deliverability and inbound spoofing protection.** Configure on the DNS for `lizardreviews.com`:

```dns
; SPF — declare authorised senders
@   IN  TXT   "v=spf1 include:_spf.google.com -all"

; DKIM — signature key (set via Google Workspace / your provider)
google._domainkey   IN  TXT   "v=DKIM1; k=rsa; p=<public-key>"

; DMARC — enforcement policy
_dmarc   IN  TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc@lizardreviews.com; pct=100; adkim=s; aspf=s"
```

Start `p=none` for monitoring, then move to `quarantine`, then `reject` once clean.

---

## 4 · HTTP-level security headers (set at deployment)

These cannot be set via HTML and **must be configured on the host** (Vercel, Cloudflare, Netlify, nginx, etc.). For Vercel, drop into `vercel.json`. For Cloudflare, use Transform Rules or a Worker.

### 4.1 Required headers (production)

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

### 4.2 Content-Security-Policy (recommended)

The site loads:
- Inline `<style>` blocks (need `'unsafe-inline'` for `style-src`, OR a hash/nonce)
- Inline `<script>` (need `'unsafe-inline'` for `script-src`, OR a hash/nonce)
- Google Fonts CSS (`fonts.googleapis.com`)
- Google Fonts woff2 files (`fonts.gstatic.com`)
- External link to Calendly on click only (not loaded as resource — doesn't need CSP allow)

**Pragmatic CSP** (allows inline + Google Fonts; tighten later with nonces if desired):

```http
Content-Security-Policy:
  default-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  script-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

To eliminate `'unsafe-inline'`, generate sha256 hashes for each inline `<style>` and `<script>` block and add them to `style-src` / `script-src`. Nonces work for SSR; for static HTML, hashes are simpler.

### 4.3 `vercel.json` reference (drop-in)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" }
      ]
    }
  ]
}
```

### 4.4 Verify after deployment

Run all three:
- **securityheaders.com** — should hit A or A+
- **observatory.mozilla.org** — should hit B+ minimum, A targeted
- **ssllabs.com/ssltest** — should hit A or A+

---

## 5 · Domain & DNS hardening

When `lizardreviews.com` is registered:

1. **Enable registrar transfer lock** (auth code only on request).
2. **Enable DNSSEC** if your registrar supports it.
3. **Set CAA record** to limit who can issue certificates for the domain:
   ```dns
   @   IN  CAA   0 issue "letsencrypt.org"
   @   IN  CAA   0 issue "pki.goog"
   @   IN  CAA   0 iodef "mailto:daniel@lizardreviews.com"
   ```
4. **MTA-STS + TLS-RPT** for inbound email TLS enforcement (after MX is live).
5. **2FA** on the registrar account, the DNS provider account, and the hosting account — non-negotiable.

---

## 6 · Operational / business risks (not strictly security but related)

### 6.1 Public claims
The site advertises specific numbers — *1,427 reviews removed, 100% success rate, 4-day median turnaround*. These are factual marketing claims, **not protected speech**. Maintain receipts:

- Internal CSV/database of every removal, with: case ID, date submitted, date removed, agency vs direct, anonymised review URL.
- Re-publish numbers monthly. The site auto-tags ledger as "4-month rolling" — keep that updated or change the language to a fixed date range.

### 6.2 Google ToS posture
The site explicitly says we don't use account compromise or fake reporting networks. **This must remain true** — a single deviation creates legal and PR risk that vastly exceeds any short-term revenue gain.

### 6.3 Defamation / liability
Removing reviews on behalf of clients can attract counter-claims (the original reviewer may sue, especially in the EU). Mitigations:

- Per-case acceptance criteria documented in writing.
- Decline cases that look defamatory toward the reviewer (e.g. "remove this review by my ex") rather than toward the business.
- Liability waiver / hold-harmless clause in agency partnership contracts.

### 6.4 Privacy policy / Terms of Service
**Recommended next-step content:**
- `/privacy/` — what data the site collects (basically nothing), what Calendly collects on the user's behalf, GDPR/CCPA rights.
- `/terms/` — service definition, the delivery guarantee, the lifetime re-removal warranty, jurisdiction (probably EU + the US states served).
- Footer link: "Privacy · Terms".

These pages aren't security-required but are **legally protective** for a service that takes money from clients.

---

## 7 · What's intentionally NOT done

- **Email obfuscation via JS.** Trades a security marginal gain for a UX/accessibility loss. Spam filters handle the volume.
- **Subresource Integrity (SRI) on Google Fonts.** Google Fonts CSS is mutable (it serves different woff2 URLs by client). SRI would break it. Reputable provider; risk accepted.
- **Server-side anything.** Site is statically generated; no server, no database, no auth, nothing to exploit at runtime beyond the host config.
- **CAPTCHAs.** No forms exist on-site. Calendly handles bot-blocking on its own forms.
- **Rate limiting.** Not applicable to a static site.

---

## 8 · Audit checklist (recurring)

Run this list quarterly or after any major change:

- [ ] All external `<a>` links still have `rel="noopener noreferrer"`.
- [ ] No new inline `onclick`/`onload` introduced.
- [ ] CSP doesn't break after CSS or JS changes.
- [ ] HTTP headers still set correctly (`securityheaders.com` re-scan).
- [ ] DNS records intact (SPF, DKIM, DMARC, CAA).
- [ ] Domain expiry > 60 days; auto-renew on.
- [ ] Registrar 2FA active.
- [ ] No new third-party scripts added without review (analytics, chat widgets, ad pixels — every one of these is a fresh privacy + security surface).

---

## 9 · Contact

Security issues, vulnerability reports, or audit questions: **daniel@lizardreviews.com**

Treat this document as the canonical security baseline. Update it when changes happen.
