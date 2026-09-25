# egoola-web

The ONE shared web app for the Egoola rebuild — Next.js (App Router), covering the
public storefront plus the buyer, seller, and admin panels in a single project.

It calls the `egoola-server` REST API only and never touches the database directly.

## Project structure

Next.js App Router with four route groups, one per panel:

| URL space        | Route group  | Layout                                |
| ---------------- | ------------ | ------------------------------------- |
| `/` (storefront) | `(public)`   | `src/app/(public)/layout.tsx`         |
| `/buyer/*`       | `(buyer)`    | `src/app/(buyer)/layout.tsx`          |
| `/seller/*`      | `(seller)`   | `src/app/(seller)/layout.tsx`         |
| `/admin/*`       | `(admin)`    | `src/app/(admin)/layout.tsx`          |

Key rules:

- **Admin does NOT share the buyer/seller login.** Every admin route lives under
  the `/admin` URL prefix (`admin/login`, `admin/dashboard`, ...) and has its own
  login page, kept separate from the shared tab-based buyer/seller login.
- **Buyers and sellers share one login/registration flow** with a tab/role switch.
  Once in, users are routed into the `(buyer)` or `(seller)` group.
- **API** is always reached through `src/lib/api.ts`, which points at
  `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).
- **UI fidelity:** buyer-facing pages must look almost exactly like the current
  live site (small additions only). Seller and admin pages keep the current
  theme/CSS but the screen layout can differ.

## Development

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run ci` (lint + typecheck + build).

## CI

`.github/workflows/ci.yml` runs lint, typecheck, and build on push/PR to `main`.