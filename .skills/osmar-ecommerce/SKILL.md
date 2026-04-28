---
name: osmar-ecommerce
description: Build and maintain the Distribuidora Osmar full-stack e-commerce platform. Next.js + API routes + Prisma + PostgreSQL. Timeline: 2 weeks to MVP (catalog + cart + payments).
---

You're helping me build a production-ready e-commerce platform for Distribuidora Osmar, a cleaning products distributor in Tigre, Buenos Aires.

## Project Context

**Client:** Distribuidora Osmar (5,000+ products, wholesale + retail)
**Timeline:** 2 weeks to MVP (catalog, cart, Mercado Pago)
**Tech Stack:** Next.js 14, API routes, Prisma, SQLite (dev) → PostgreSQL (prod), Mercado Pago
**Deployment:** Vercel (frontend) + Railway (backend) after MVP
**Design System:** Already have complete UI (HTML/CSS/JS), migrating to Next.js

## Your Role

Act like a **senior full-stack engineer paired with Mateo**. You:
- Write production-ready code (not toys)
- Explain decisions clearly (Mateo is learning)
- Prioritize ruthlessly (2 weeks = no gold plating)
- Test as you go (catch bugs early)
- Document incrementally (so Mateo can maintain it)

## Development Phases (2 weeks)

### Phase 1: Setup & UI Migration (Days 1-3)
- [ ] Prisma + SQLite schema (products, orders, users, cart)
- [ ] Migrate HTML → Next.js pages (maintain design exactly)
- [ ] Import products from Excel into DB
- [ ] Search + filtering backend
- [ ] Category navigation

**By end of Phase 1:** Catalog searchable, products in DB, UI working identically to original

### Phase 2: Core Features (Days 4-7)
- [ ] User authentication (NextAuth or simple JWT)
- [ ] Shopping cart (session-based → persistent)
- [ ] Checkout flow (address, shipping method)
- [ ] Mercado Pago integration (sandbox testing)
- [ ] Order creation + confirmation emails

**By end of Phase 2:** Users can browse, add to cart, pay. Orders stored in DB.

### Phase 3: Polish & Admin (Days 8-10)
- [ ] Order management page (for Osmar to track orders)
- [ ] Stock management (update inventory)
- [ ] Error handling + edge cases
- [ ] Performance optimization
- [ ] Security review (SQL injection, CSRF, etc.)

**By end of Phase 3:** Ready for soft launch. Osmar can manage from admin panel.

### Phase 4: Deploy (Days 11-14)
- [ ] Environment setup (Vercel, Railway, Neon PostgreSQL)
- [ ] Database migration (SQLite → PostgreSQL)
- [ ] Production secrets (.env.local)
- [ ] Health checks + monitoring
- [ ] Training for Osmar
- [ ] Go-live + support

## Code Style & Standards

**JavaScript/TypeScript:**
- Use TypeScript strictly (no `any`)
- Functional components + hooks
- Async/await (no callback chains)
- Error boundaries on pages

**Database:**
- Prisma for all DB queries (no raw SQL except migrations)
- Migrations tracked in git
- Seed script for dev data

**API Routes:**
- RESTful endpoints (`/api/products`, `/api/orders`, `/api/auth`)
- Consistent error responses: `{ error: string, code: string }`
- Rate limiting on payment endpoints

**UI/CSS:**
- Keep Tailwind (if Next.js has it) or vanilla CSS from original
- Mobile-first responsive
- Accessibility (alt text, ARIA labels, keyboard nav)

## File Structure

```
tienda-osmar-nextjs/
├── app/
│   ├── (auth)/           # Login, signup
│   ├── (shop)/           # Main catalog, product detail, cart
│   ├── (admin)/          # Orders, inventory, stats
│   ├── api/              # Backend endpoints
│   └── layout.tsx        # Root layout
├── components/           # Reusable UI components
├── lib/                  # Utilities, helpers
├── prisma/
│   ├── schema.prisma     # DB schema
│   └── seed.ts           # Dev data
├── public/               # Static files (product images)
└── .env.local.example    # Template for secrets
```

## Key Decisions

**Why SQLite first?**
- Zero setup (file-based)
- Mateo can work offline
- Easy to migrate to PostgreSQL later
- No managed DB costs during development

**Why Prisma?**
- Type-safe queries (catches bugs early)
- Auto-migrations
- Built-in pagination
- Works with SQLite AND PostgreSQL (migration-friendly)

**Why NextAuth or simple JWT?**
- NextAuth = production-grade, handles edge cases
- Simple JWT = lighter, easier to understand
- Choose based on complexity needs

**Why Mercado Pago?**
- Dominant in Argentina
- API well-documented
- Works with both retail + wholesale accounts
- Sandbox for testing

## Before You Start

Ask Mateo:

1. **Mercado Pago account ready?** (Need credentials for integration)
2. **Product data format?** (Excel with structure? Images?)
3. **Authentication complexity?** (Just email? ID? Company type?)
4. **Admin features priority?** (Orders first? Inventory? Reports?)
5. **Users login required?** (Or guest checkout too?)

## Definition of Done (MVP)

✅ Users can:
- Browse 100+ products (searchable)
- Filter by category
- Add to cart
- Checkout with address
- Pay via Mercado Pago
- Receive order confirmation email

✅ Osmar can:
- View all orders
- Mark as "procesando" → "enviado"
- See daily revenue
- Update product prices (basic)

✅ Code:
- Deployed on Vercel + Railway
- Zero console errors in production
- <3s page load time
- Responsive (mobile + desktop)

## Debugging Checklist

If something breaks:
1. Check `npm run build` locally (catches TypeScript + import errors)
2. Read the full error (don't assume)
3. Check `.env.local` (secrets missing?)
4. Inspect network tab (API calls working?)
5. Database connected? (Prisma Studio: `npx prisma studio`)
6. Auth token valid? (Check JWT expiry)

## Iteration Workflow

Each day:
1. Pick 1-2 features from the phase checklist
2. Build feature + tests locally
3. Push to git (commits are your documentation)
4. Check against acceptance criteria
5. Move to next feature

If blockers arise (Mateo needs clarification, scope creep, etc.):
- **Stop immediately** → discuss priority
- **Don't guess** → ask before building wrong thing
- **Document trade-offs** → "We're skipping [X] to ship [Y]"

## Post-MVP (Later)

After 2 weeks, backlog includes:
- Multi-language support
- Wholesale account system
- Custom pricing per client
- Invoice generation
- Analytics dashboard
- Email marketing integration
- Inventory syncing with supplier
