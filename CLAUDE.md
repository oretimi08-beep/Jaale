# Jaale: build brief for Claude Code

> **Decisions made since this brief was written (Nov 2026)**
> - The app is named **Jàá lè** ("last price" in Yoruba), sold as "pre-loved items". Web address and code names stay "jaale". The name lives in `src/lib/config.ts` (`BRAND`).
> - Sign-in is **email + password** for now (so people can change and reset passwords). Phone OTP via Termii is a paid add-on for later; a phone number is collected optionally and stored privately in `profile_private`.
> - Payments, orders, offers, chat and reviews are UI previews only. Nothing is charged.
> - Item, checkout, profile, sell and sign-up screens are full pages styled as panels, not slide-in sheets.
> - The design prototype is in `docs/design-prototype.html`.

# Original brief

A secondhand marketplace for Nigeria, like Vinted. People buy and sell pre-loved **fashion**, **home and furniture**, and **appliances**. The main promise is trust: the buyer's money is held until the item arrives and checks out.

- **Working name:** the beta was called "Declotr" (web.declotr.com). The product is being renamed and has no new name yet. Use the placeholder `Brandname` everywhere, and keep it in **one config constant** so it can be swapped in one place.
- **Owner:** Timi Ore. Timi is new to building apps. Explain things in plain language, avoid jargon, and say what you changed after each step.
- **Design reference:** `docs/design-prototype.html` is a clickable prototype of the agreed design. Match its layout, flows, copy and colours. It uses made-up sample data; the real app uses a database.
- **Business plan:** the full research doc (competitors, fees, legal) is at https://claude.ai/artifact/8f4173oP6s6DYJH6JPF56Z

---

## 1. Tech stack

| Part | Use | Notes |
| --- | --- | --- |
| App framework | **Next.js (App Router) + TypeScript** | Mobile-first web app. Native apps come later. |
| Styling | **Tailwind CSS** | Map the design tokens in section 3 to the Tailwind theme and CSS variables. |
| Database, auth, storage | **Supabase** (Postgres, Auth with phone OTP, Storage) | Use Row Level Security on every table. |
| Payments | **Paystack** | Card, bank transfer, USSD. Payouts to sellers through the Transfers API. Webhooks confirm payments. |
| Delivery | **Shipbubble** API (Sendbox as backup) | Price quotes at checkout, booking, tracking. Stub this behind an interface at first. |
| SMS / OTP | Supabase phone auth with **Termii** as the SMS provider | |
| Images | Supabase Storage. Resize and compress on upload. | Pages must load fast on mobile data. |
| Hosting | **Vercel** | |

Keep secrets in `.env.local`, never in code. Create `.env.example` listing every variable with no values.

---

## 2. Non-negotiable product rules

1. **Browsing is open, everything else needs a profile.** Anyone can browse, search and view items and profiles. Buying, selling, making an offer, bidding, messaging, following and viewing orders all require a signed-in user with a completed profile. If a signed-out user taps one of these, show the sign-up flow and then **resume the action** they started.
2. **Sign-up is 3 steps:** (1) Nigerian phone number (+234), (2) 6-digit SMS code, (3) profile: full name, unique username, city, optional photo, "I'm here to: buy and sell / mostly buy", and accept the terms.
3. **Selling is free.** Sellers keep 100% of the item price.
4. **Buyers pay a buyer protection fee of ₦300 + 5% of the item price**, plus delivery. Keep the fee formula in one config file.
5. **Escrow-style hold.** After payment, the money is held and the seller is not paid yet. The buyer has **2 days after delivery** to tap "Item received, all good" or "Report a problem". With no action after 2 days, the money is released automatically. A reported problem freezes the payout and opens a dispute for an admin.
6. **Payments and chats stay in the app.** Detect phone numbers, bank account numbers and "pay me directly" phrases in chat, and show a warning.
7. **Followers and following.** Any user can follow any other user. Profiles show follower, following and listing counts. A **Following** feed shows new listings from people you follow.
8. **Two-way ratings.** After an order completes, the buyer rates the seller and the seller rates the buyer (1 to 5 stars, quick tags, optional comment). Each profile shows a **seller rating** and a **buyer rating** separately. Reviews are **double-blind**: both appear at the same time, once both have rated or after 7 days.
9. **Bulky items** (Home and furniture, Appliances) use **van delivery** or **self-pickup** instead of riders and pickup points. The sell form asks for **dimensions** instead of size. Appliances can be marked **"Tested and working"**.
10. **Currency is naira.** Store money as integer **kobo**, show it as `₦12,500`.

---

## 3. Design system (match exactly)

**Look (changed Nov 2026, Timi approved):** Mandarin Orange hero, Forest Green brand colour and Crest Yellow highlights on a warm peach-cream background. Light and dark mode are both required. Follow the system setting, with a manual toggle. The tokens live in `src/app/globals.css`.

### Colour tokens

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--primary` | `#015D47` forest green | `#5CC9A0` | Logo, main buttons, icons, links |
| `--primary-soft` | `#DDEBE5` | `#12352B` | Selected options, spotlight panels |
| `--accent` | `#E0F354` crest yellow | `#E0F354` | Hero "List an item" button and "no wahala", step numbers, NEW tags, store rings, logo dot |
| `--hero` | `#FD550A` mandarin orange | `#E04A06` | Home hero band (white text) |
| `--mark` | `#015D47` | `#E0F354` | Tab underlines, focus rings |
| `--success` | `#0B7A57` | `#7FD3A8` | "Protected" ticks, money-held notes |
| `--danger` | `#C2410C` | `#FF8A57` | Discount badges, notification dots, errors |
| `--bg` | `#FFF4EA` | `#0F1A16` | Page background |
| `--surface` | `#FFFDF9` | `#16231E` | Cards, header, sheets |
| `--line` | `#F1DCCB` | `#26372F` | Borders |
| `--fg` | `#14251F` | `#EEF3EE` | Main text |
| `--muted` | `#5F6B64` | `#9FB2A9` | Secondary text |
| `--on-primary` | `#FFFFFF` | `#0B1F19` | Text on primary |

Text on `--accent` is always dark green (`#0E2A22`). Never use yellow for text or lines on a light background; it is too faint.

### Type
- **Display / headings:** Bricolage Grotesque (700 to 800), with tight letter-spacing on big headings.
- **Body / UI:** Figtree (400 to 700).
- Prices use tabular numbers.

### Shape and layout
- Radius 14px on cards and inputs, pill-shaped buttons and chips.
- Item photos are 4:5. The grid is 2 columns on phones, about 5 on desktop.
- Item, checkout, order tracking, profile, sign-up, sell and rating screens open as a **right-side sheet on desktop** and a **bottom sheet on phones**.
- The hero band uses a faint adire-style line pattern over the primary colour.

---

## 4. Screens and what each must do

1. **Header (sticky):** logo, search ("Search dresses, sofas, fridges, sellers…"), saved items with count, orders, "Sign in" (signed out) or avatar (signed in), and a "Sell now" button. Below it, department tabs: **All, Following, Women, Men, Kids, Home & furniture, Appliances**.
2. **Home:** a hero with the 3-step "How your money stays safe" box; **Shop by category** icon rail; **Featured stores** (round avatars with ring and verified tick); **Trending** rail (most saved); a **home and appliances spotlight** panel; and an **Explore** grid with sort (newest, price low and high, biggest discount) and "Load more".
3. **Item card:** photo; badges for **-X%**, **PRE-OWNED / NEW**, and **AUCTION**; a heart with save count; title; price with the old price struck through; seller name with verified tick and area; and "₦X incl. protection" in green.
4. **Item page:** photos, title, price, tags (brand, size or dimensions, condition, location, tested), notes for auctions and bulky items, a seller row that links to their profile and shows both ratings and follower count, a "Protected purchase" note, **Make an offer / Buy now**, or **Ask a question / Place a bid** for auctions.
5. **Checkout:** delivery choice (rider, courier or pickup point for parcels; van, intercity van or self-pickup for bulky items), a price breakdown (item, buyer protection, delivery, total), pay method (card, transfer, USSD), and "Pay ₦X securely".
6. **Order tracking:** a timeline (Payment received and held → Seller packed → Rider/van on the way → Check your item, 2 days → Seller gets paid) with **Report a problem** and **Item received, all good** buttons. "All good" opens the rating screen.
7. **Rating screen:** stars, quick tags (As described, Fast delivery, Well packed, Friendly, Good value), a comment, and the double-blind explanation.
8. **Profile:** avatar, name, @username, city, join date, follower / following / listing counts (tappable), seller and buyer rating boxes, Follow/Following and Message buttons (or Edit profile, Sell an item and Sign out on your own profile), and tabs for **Listings, Reviews, Followers, Following**. Each review is labelled "Rated as a seller, by a buyer" or "Rated as a buyer, by a seller".
9. **Sell form:** up to 8 photos, title, category grouped by department, condition, brand, size or dimensions (switches automatically), price, and a live "You receive ₦X" line.
10. **Sign-up flow:** the 3 steps from section 2, with a progress bar.
11. **Admin (simple, protected):** users, listings, orders, disputes, payouts, bans.

---

## 5. Data model (Supabase / Postgres)

- `profiles`: id (= auth user id), full_name, username (unique), avatar_url, city, goal, verified_bank, created_at
- `follows`: follower_id, following_id, created_at (primary key on both ids)
- `departments` and `categories`: slug, name, department, icon, is_bulky
- `listings`: id, seller_id, title, description, category_id, brand, size, dimensions, condition (`new_with_tags` / `pre_owned`), tested_working, price_kobo, was_price_kobo, city, area, status (`active` / `reserved` / `sold` / `removed`), is_auction, auction_ends_at, created_at
- `listing_photos`: listing_id, url, position
- `saves`: user_id, listing_id
- `offers` and `bids`: listing_id, user_id, amount_kobo, status
- `conversations` and `messages`: in-app chat, with a flag for blocked-content warnings
- `orders`: id, listing_id, buyer_id, seller_id, item_kobo, protection_fee_kobo, delivery_kobo, total_kobo, delivery_method, status (`pending_payment` → `paid_held` → `shipped` → `delivered` → `completed` or `disputed` → `refunded` / `released`), paystack_reference, delivered_at, release_at
- `deliveries`: order_id, provider, quote_kobo, tracking_ref, status
- `reviews`: order_id, reviewer_id, reviewee_id, role (`buyer_rates_seller` / `seller_rates_buyer`), stars, tags[], comment, visible_at
- `payouts`: order_id, seller_id, amount_kobo, paystack_transfer_code, status
- `disputes`: order_id, opened_by, reason, photos, status, resolution

Seller and buyer ratings are averages of `reviews` by role, counting only rows where `visible_at <= now()`.

---

## 6. Build order (do one phase at a time, and show Timi after each)

**Phase 0: setup.** Next.js + TypeScript + Tailwind with the tokens from section 3, the fonts, light/dark mode, a `Brandname` config constant, ESLint and Prettier. Port the prototype's header, home and item card as static components using seed data.

**Phase 1: browse.** Supabase schema and seed data, home sections, department tabs, categories, search, sort, item page, public profiles, saves.

**Phase 2: accounts.** Phone OTP sign-up, the 3-step profile flow, the auth gate that resumes the action, profile editing, follow and unfollow, Following feed.

**Phase 3: selling.** Sell form with photo upload and compression, edit and remove listings, size vs dimensions by category.

**Phase 4: buying.** Checkout, Paystack payment, a webhook that marks orders `paid_held`, a delivery quote (stubbed, then Shipbubble), order tracking, confirm or report, and auto-release after 2 days via a scheduled job.

**Phase 5: trust.** Two-way double-blind reviews, rating averages, dispute flow, chat with contact-detail warnings, and the admin page.

**Phase 6: payouts and launch.** Seller wallet and Paystack transfers to verified bank accounts (with the bank account name matched to the profile name), privacy policy and terms pages, analytics, and a launch checklist.

Write tests for the money logic (fee formula, totals, release timing, refund paths) before connecting real payments. Use Paystack **test mode** until Timi says go live.

---

## 7. Ask Timi first before

- Choosing or changing the app's name, logo or domain.
- Switching Paystack to live mode, or anything that moves real money.
- Changing the fee, the 2-day window or the refund rules.
- Adding paid services or anything with a monthly cost.

## 8. Open questions

- New app name and logo.
- Escrow licensing: confirm with a Nigerian lawyer how to hold buyer funds (for example Paystack split payments or a licensed escrow partner).
- Which cities launch first (the plan suggests Lagos only).
- Do auctions launch in version 1, or later?
- The beta's **Reels** feature: keep it, and if so, when?
