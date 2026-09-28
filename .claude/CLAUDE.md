# Client Management System — Admin Frontend

You are a senior React frontend engineer.

I already cloned an existing **shadcn-admin dashboard template**.

Your job is NOT to rebuild the frontend from scratch.

Your job is to adapt the EXISTING project into a clean **Client Management Admin UI** while preserving the existing project structure, architecture, components, styling conventions, routing approach, and shadcn/ui implementation.

---

# 1. CRITICAL RULE — DO NOT RESTRUCTURE THE PROJECT

Before changing anything:

1. Inspect the entire existing frontend repository.
2. Understand its current folder structure.
3. Understand its routing system.
4. Understand its existing layout system.
5. Understand its sidebar/navigation configuration.
6. Understand how the existing DataTable works.
7. Understand how shadcn/ui components are used.
8. Understand the existing theme/dark mode system.
9. Understand existing hooks, context/providers, utilities, and TypeScript types.
10. Reuse existing patterns whenever possible.

DO NOT:

* create a new React project
* replace the existing router
* reorganize the whole `src` directory
* move files unnecessarily
* replace shadcn/ui
* replace Tailwind
* replace the existing sidebar
* replace the existing header
* replace the existing DataTable implementation if it is reusable
* convert TypeScript to JavaScript
* introduce Redux
* introduce another UI framework
* add Material UI
* add Ant Design
* add Bootstrap
* redesign the entire template architecture

Preserve the existing template.

Only modify what is necessary to turn it into the Client Management System.

---

# 2. Technology

Continue using whatever compatible versions are already installed in the cloned repository.

The project should remain based on:

* React
* Vite
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Router if already used
* TanStack Table if already used
* TanStack Query if already available
* existing icon library
* existing form/validation libraries

Do not unnecessarily upgrade dependencies.

Do not replace working dependencies just because newer alternatives exist.

---

# 3. System Purpose

This is a small internal admin frontend.

Public clients submit information through a separate public form.

The admin frontend mainly needs to:

* see submitted client data
* search client data
* filter client data
* paginate client data
* open client details
* view uploaded images
* view/download PDFs
* export filtered results to Excel
* login/logout

Do NOT turn this into a complicated CRM.

---

# 4. Main Navigation

Simplify the existing sidebar.

The primary navigation should contain only:

```text
CLIENT SYSTEM

Clients
```

Use an appropriate existing icon such as:

```text
Users
```

Do not create many unnecessary navigation items.

Remove or hide demo navigation such as:

* Dashboard demo
* Tasks
* Apps
* Chats
* Users demo
* Products
* Charts
* Notes
* Calendar
* Settings pages that are not required
* Help Center demo
* demo nested menus

Do not delete shared components if they are required internally by the template.

Prefer removing unused items from navigation/routes cleanly.

---

# 5. Preserve Existing Layout

Keep the existing dashboard shell.

The final desktop layout should conceptually look like:

```text
┌───────────────────────────────────────────────────────────────────────┐
│ ☰ Client Management                                  Theme   Admin ▼ │
├─────────────────┬─────────────────────────────────────────────────────┤
│                 │                                                     │
│ CLIENT SYSTEM   │ Clients                                             │
│                 │ View and filter client submissions                  │
│ 👥 Clients      │                                                     │
│                 │                                                     │
│                 │ [ 🔍 Search client name or phone...              ] │
│                 │                                                     │
│                 │ [Province ▼] [District ▼] [Commune ▼] [Sale GB ▼] │
│                 │                                                     │
│                 │ [From Date] [To Date]             [Clear filters] │
│                 │                                                     │
│                 │ ┌─────────────────────────────────────────────────┐ │
│                 │ │ Name │ Phone │ Province │ District │ Sale GB  │ │
│                 │ ├─────────────────────────────────────────────────┤ │
│                 │ │ ...                                            │ │
│                 │ │ ...                                            │ │
│                 │ │ ...                                            │ │
│                 │ └─────────────────────────────────────────────────┘ │
│                 │                                                     │
│                 │ Showing 1–20 of 125                ← 1 2 3 4 5 →   │
│                 │                                                     │
└─────────────────┴─────────────────────────────────────────────────────┘
```

This diagram describes the desired content, NOT a requirement to rewrite the existing layout.

Adapt the current layout to achieve this appearance.

---

# 6. Design Direction

The UI should feel:

* clean
* professional
* modern
* simple
* spacious but not wasteful
* easy for office/admin staff
* responsive
* consistent with shadcn/ui

Avoid:

* gradients
* excessive shadows
* giant dashboard cards
* colorful KPI cards
* unnecessary charts
* excessive animations
* glassmorphism
* overly rounded everything
* huge headings
* unnecessary decorative elements

This is an internal data-management system.

Prioritize readability and efficiency.

---

# 7. Clients Page

The main authenticated page should be the Clients page.

Suggested URL:

```text
/clients
```

If the existing routing architecture requires an authenticated route group, follow its existing convention.

Do not redesign the router.

Page heading:

```text
Clients
```

Description:

```text
View and filter client submissions
```

---

# 8. Search

At the top of the client page provide a search input.

Placeholder:

```text
Search name, phone, or submission no...
```

Search should eventually support:

* client name
* phone
* submission number

Use the existing shadcn `Input`.

Include a search icon if consistent with the template.

Do not call the backend on every single keystroke without control.

Use either:

* debounce around 300–500ms

or:

* explicit search submission

Follow the project's existing pattern if one exists.

When search changes, reset pagination to page 1.

---

# 9. Filters

Below or beside search provide filters for:

```text
Province
District
Commune
Sale GB
From Date
To Date
```

Use existing shadcn components.

Prefer searchable Combobox/Command-style selectors for location and Sale GB if appropriate.

---

# 10. Cascading Location Filters

Location filtering must work hierarchically.

Flow:

```text
Province
    ↓
District
    ↓
Commune
```

On initial page load:

```text
load provinces
```

When Province changes:

```text
reset district
reset commune
load districts for selected province
```

When District changes:

```text
reset commune
load communes for selected district
```

Do not load every district and commune in Cambodia unnecessarily.

Disable District until Province is selected.

Disable Commune until District is selected.

---

# 11. Sale GB Filter

Sale GB should be loaded from the backend.

Do not hardcode Sale GB names in the frontend.

Provide:

```text
All Sale GB
```

as the empty/default filter state.

---

# 12. Date Filtering

Provide:

```text
From Date
To Date
```

Use the existing shadcn date/calendar components if already available.

Do not introduce another date library unnecessarily.

Validate logically:

```text
fromDate <= toDate
```

Keep the UI compact.

---

# 13. Clear Filters

Provide a button:

```text
Clear filters
```

When clicked:

* clear search
* clear province
* clear district
* clear commune
* clear Sale GB
* clear dates
* return to page 1
* reload the unfiltered data

Use a secondary/outline/ghost style consistent with the existing design.

---

# 14. Active Filters

If it fits the existing template cleanly, show active filters as subtle removable badges/chips.

Example:

```text
Phnom Penh ×
Chamkarmon ×
Sale: Dara ×
```

Do not add this if it makes the interface cluttered.

The primary requirement is the filter controls themselves.

---

# 15. Client Data Table

Reuse the template's existing DataTable/TanStack Table implementation.

Do NOT create an entirely separate table system unless the existing one cannot support the requirements.

Columns should be approximately:

```text
Submission No
Client Name
Phone
Province
District
Commune
Sale GB
Submitted At
Actions
```

Responsive behavior may hide lower-priority columns on smaller screens.

The most important information is:

```text
Client Name
Phone
Location
Sale GB
Submitted At
```

---

# 16. Table Formatting

Client name:

```text
សុខា
```

Phone:

```text
012 345 678
```

Location should be readable.

Do not dump MongoDB IDs into the table.

Submitted date should be human-readable.

Example:

```text
28 Sep 2026
10:32 AM
```

or another clean locale-aware format.

Use consistent formatting.

---

# 17. Row Interaction

Make it easy to inspect a client.

Either:

* clicking a row opens details

or:

* use an Actions menu with `View details`

Prefer the approach most consistent with the existing template.

Do NOT add:

```text
Edit
Delete
```

unless those operations are actually supported by the backend.

This admin system is primarily read-only for client submissions.

---

# 18. Client Detail Sheet

Prefer using the existing shadcn:

```text
Sheet
```

to open client details from the right side.

Do not require a separate page unless the existing architecture makes that significantly cleaner.

Target:

```text
                                    ┌──────────────────────────────┐
                                    │ Client Details            × │
                                    │                              │
                                    │ CLIENT INFORMATION           │
                                    │                              │
                                    │ Submission No                │
                                    │ CL-20260928-ABC123           │
                                    │                              │
                                    │ Name                         │
                                    │ សុខា                         │
                                    │                              │
                                    │ Phone                        │
                                    │ 012 345 678                  │
                                    │                              │
                                    │ LOCATION                     │
                                    │                              │
                                    │ Province   Phnom Penh        │
                                    │ District   Chamkarmon        │
                                    │ Commune    Boeung Keng Kang  │
                                    │                              │
                                    │ SALE GB                      │
                                    │ Dara                         │
                                    │                              │
                                    │ Submitted                    │
                                    │ 28 Sep 2026 · 10:32 AM       │
                                    │                              │
                                    │ DOCUMENTS                    │
                                    │                              │
                                    │ [ Image ] [ Image ]         │
                                    │                              │
                                    │ 📄 document.pdf     [View]  │
                                    └──────────────────────────────┘
```

---

# 19. Client Details Sections

Organize the Sheet into clear sections:

### Client Information

Show:

```text
Submission No
Client Name
Phone
Submitted At
```

### Location

Show:

```text
Province
District
Commune
```

### Sale GB

Show:

```text
Sale GB
```

### Documents

Show uploaded:

```text
images
PDFs
```

Use separators/spacing rather than excessive Cards inside Cards.

---

# 20. Images

For image attachments:

* show thumbnail
* preserve aspect ratio
* use sensible thumbnail dimensions
* clicking should allow larger preview
* handle loading state
* handle broken image state

Do not display giant full-resolution images immediately inside the Sheet.

If the backend returns a short-lived presigned URL, use it normally.

---

# 21. PDF Files

For PDFs display something like:

```text
📄 customer-document.pdf

[View]
```

Opening can use a new browser tab if appropriate.

Do not attempt to build a custom PDF reader.

---

# 22. Export Excel

Add:

```text
Export Excel
```

button near the filters/table controls.

Use an appropriate download icon.

When clicked, call:

```text
GET /api/admin/submissions/export
```

Pass the CURRENT filters:

```text
search
provinceId
districtId
communeId
saleGbId
dateFrom
dateTo
```

Do not export only the currently visible table page.

The backend controls the export.

Handle the returned Excel blob and download it.

Show loading state while export is being generated.

Example:

```text
Exporting...
```

Prevent duplicate clicks while exporting.

---

# 23. Pagination

Pagination is server-side.

Backend response will approximately contain:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "totalPages": 7,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

Default:

```text
page = 1
limit = 20
```

Display:

```text
Showing 1–20 of 125
```

and pagination controls.

Do not fetch all submissions and paginate them in React.

When filters/search change:

```text
page = 1
```

---

# 24. API Integration

Backend development URL:

```text
http://localhost:5000
```

Use an environment variable.

Example:

```env
VITE_API_URL=http://localhost:5000
```

Create/update:

```text
.env.example
```

Do not hardcode production API URLs inside components.

---

# 25. API Endpoints

The frontend should be prepared to consume:

```text
AUTH

POST /api/admin/auth/login
GET  /api/admin/auth/me
POST /api/admin/auth/logout


CLIENTS

GET /api/admin/submissions
GET /api/admin/submissions/:id
GET /api/admin/submissions/export


LOCATIONS

GET /api/public/locations/provinces
GET /api/public/locations/districts?provinceId=...
GET /api/public/locations/communes?districtId=...


SALE GB

GET /api/public/sales
```

Do not invent additional endpoints unless necessary.

---

# 26. API Layer

Inspect how the existing template handles API calls.

Reuse that approach if clean.

Do NOT scatter raw `fetch()` calls throughout presentation components.

Keep API concerns reasonably separated.

Conceptually:

```text
UI
 ↓
hook/query
 ↓
API/service
 ↓
Express backend
```

Do not restructure the entire project merely to enforce this diagram.

Fit the implementation into the template's current architecture.

---

# 27. Authentication

Reuse the template's existing authentication UI where practical.

Adapt the login page to this system.

Brand/title:

```text
Client Management
```

Login fields:

```text
Email
Password
```

Button:

```text
Sign in
```

Remove:

* Google login
* GitHub login
* registration
* create account
* forgot password

unless already required by the backend.

This system currently only needs admin login.

---

# 28. Login Behavior

On successful login:

```text
/login
   ↓
/clients
```

Unauthenticated access to protected admin pages should redirect to:

```text
/login
```

Authenticated access to `/login` may redirect to:

```text
/clients
```

Use the existing route guard/auth mechanism if one exists.

Do not build a completely separate auth architecture if the template already provides one.

---

# 29. Authentication Security

Follow the backend's actual authentication mechanism.

If the backend uses Bearer JWT:

```text
Authorization: Bearer <token>
```

centralize that behavior in the API client.

Handle:

```text
401 Unauthorized
```

cleanly.

On expired/invalid authentication:

* clear invalid session state
* redirect to login

Do not expose tokens in UI.

Do not log tokens.

If backend implementation uses secure cookies instead, adapt to that instead of forcing localStorage.

Inspect backend contract before implementing.

---

# 30. Header

Keep the existing header.

Remove irrelevant demo actions.

Useful items may include:

```text
sidebar toggle
theme toggle
admin profile dropdown
logout
```

Do not fill the header with unnecessary controls.

---

# 31. Sidebar

Keep the existing sidebar component and its collapse/mobile behavior.

Change branding to something appropriate such as:

```text
Client Management
```

Navigation:

```text
CLIENT SYSTEM

Clients
```

At the bottom keep the existing user/profile control if it fits.

Example:

```text
LR
Administrator
Admin
```

Do not hardcode a real person's name.

Use authenticated user information from the API when available.

---

# 32. Loading States

Provide good loading states.

For initial table loading, use:

* existing Skeleton components

or:

* existing table loading implementation

Avoid showing a blank page.

Filters can show appropriate loading states while options load.

Client details Sheet should show loading state while fetching details.

---

# 33. Empty States

When no clients exist:

```text
No client submissions yet.
```

When filters return no results:

```text
No clients match the selected filters.
```

Provide:

```text
Clear filters
```

when useful.

Do not show an error-looking state for valid empty results.

---

# 34. Error States

Handle API failures gracefully.

Example:

```text
Unable to load client submissions.
```

Provide Retry where useful.

Do not show:

* raw Axios errors
* stack traces
* `[object Object]`
* backend internals

Use the existing toast system if the template already has one.

---

# 35. Responsive Design

The system must work on:

* desktop
* laptop
* tablet
* mobile

Desktop should use the existing sidebar.

Mobile should use the template's existing sidebar/drawer behavior.

For filters on desktop:

```text
Province | District | Commune | Sale GB
```

For smaller screens stack them naturally.

Do not force a wide desktop table to destroy the mobile layout.

Use responsive column visibility or horizontal scrolling when appropriate.

---

# 36. Khmer Support

Client names and location names may contain Khmer Unicode.

Ensure:

* UTF-8 works correctly
* text is not truncated incorrectly
* components handle Khmer characters
* search input accepts Khmer normally

Do not apply Latin-only validation to client names.

Use the project's existing font unless Khmer rende
