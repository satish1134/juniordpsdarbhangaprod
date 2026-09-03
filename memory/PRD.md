# Junior DPS Darbhanga — Product Requirements

## Original Problem Statement
Build a revised and advanced website for https://www.juniordpsdarbhanga.com. Pixel-perfect, modern, multi-page setup with a comprehensive Admin CMS.

## Architecture
- **Frontend**: React + TailwindCSS + shadcn/ui + `ContentContext`. Runtime **ThemeVars** re-skins the site and auto-switches on festivals.
- **Backend**: FastAPI + MongoDB. HTTPOnly cookie auth + optional TOTP 2FA + bcrypt passwords. Resend for email. Security-hardened.
- **CMS**: `content` collection stores `{section, data}` docs, falls back to `DEFAULT_CONTENT` seed.

## Completed
- Multi-page site with full Admin CMS
- Editable sections: Mission/Vision/Purpose, Awards, Transport, Brochure, Careers
- Enquiry email alerts via Resend
- Theme Colors (7 presets + custom + seasonal auto-swap)
- Security hardening (HSTS, CSP, XFO, nosniff, strict CORS, brute-force, robots.txt)
- TOTP 2FA + Admin Audit Log + Password change + Hidden admin (Alt+Shift+A)
- **Feb 2026 (this iteration)** Current Notices + Curriculum sections

## This iteration
### Curriculum
- New section on the home page (between Admissions and Notices/Contact)
- Tabbed layout: left rail of class cards, right panel showing subjects (pill list), co-curricular text, optional gold callout note
- Editable via Admin → Site Content → **Curriculum** tab: enable toggle, intro fields, add/edit/remove class cards with grade, level, comma-separated subjects, co-curricular text, note

### Current Notices
- New section right before the footer/contact area
- 2-column responsive grid of notice cards with URGENT flag (red border + red badge), category pill, date, body and optional read-more link
- "Show all N notices" toggle when more than 4 notices exist
- Editable via Admin → Site Content → **Current Notices** tab

Both sections default to visible with seeded sample content.

## Test Credentials
See `/app/memory/test_credentials.md`.

## Backlog (P1 → P2)
- **P1** Populate CBSE Affiliation No.
- **P1** Verify domain at resend.com/domains
- **P2** Recovery codes for 2FA
- **P2** CSV export of audit log
- **P2** Refactor ContentEditor.jsx (~2900 lines) into sub-editors

## Key Files (this iteration)
- `/app/backend/server.py` — `current_notices` and `curriculum` seed sections
- `/app/frontend/src/components/CurrentNotices.jsx`
- `/app/frontend/src/components/Curriculum.jsx`
- `/app/frontend/src/pages/HomePage.jsx` — inserts both before Contact
- `/app/frontend/src/components/ContentEditor.jsx` — two new tabs + `withIds` bootstrap for nested arrays
