# depot-entry-admin

Admin frontend for the Client Management System. Staff sign in to view,
search, filter and export client submissions.

Built on [shadcn-admin](https://github.com/satnaing/shadcn-admin) (MIT) with
React, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Router, Query and Table.

## Features

- Admin login (JWT Bearer) with protected routes and session expiry handling
- Clients table with server-side pagination
- Debounced search by name, phone or submission number
- Cascading Province → District → Commune filters, Sale GB and date range filters
- Client detail panel with image previews and PDF links
- Excel export of the current filtered results
- Light/dark theme and Khmer text support

## Getting started

Requirements: Node.js 22+ and pnpm 10.

```bash
pnpm install
cp .env.example .env   # set VITE_API_URL to the backend URL
pnpm dev
```

The app runs at http://localhost:5173 and expects the backend at
`VITE_API_URL` (default `http://localhost:5000`).

## Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | Start the dev server               |
| `pnpm build`        | Type-check and build to `dist/`    |
| `pnpm lint`         | Run ESLint                         |
| `pnpm format:check` | Check formatting with Prettier     |
| `pnpm test`         | Run the Vitest browser test suite¹ |

¹ Run `pnpm test:browser:install` once to download the test browser.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, Prettier, type check,
tests and a production build on every push and pull request to `main`.

## License

MIT, see [LICENSE](LICENSE).
