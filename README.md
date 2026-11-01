# Jaale

Jaale (“last price” in Yoruba) is a secondhand marketplace for Nigeria: pre-loved fashion, home and furniture, and appliances. The main promise is trust: the buyer's money is held until the item arrives and checks out.

Built with Next.js, Supabase (database, logins, photo storage) and Vercel (hosting).

## What works now

- Create an account (email and password), set up a profile, sign in, sign out
- Change your password in Settings, or reset it by email if you forget it
- Edit your profile: photo, name, username, city, phone (kept private), bio
- Sell: add up to 8 photos (shrunk on the phone before upload), category, condition, brand, size or dimensions, price
- Edit your listings, mark them sold or reserved, put them back on sale, or remove them
- Browse by department and category, search, sort, “Load more”
- Save items with the heart, follow sellers, and a Following feed
- Profiles with follower, following and listing counts
- Light and dark mode

Payments, orders, chat, offers and reviews show how they will look but don't work yet. Checkout says “Preview only” and nothing is charged.

## Running it on your computer

1. Put your Supabase keys in `.env.local` (see `.env.example` for the list).
2. `npm install`
3. `npm run db:migrate` sets up the database tables (safe to run again).
4. `npm run db:seed` adds 8 demo stores and 24 sample items. `npm run db:seed -- --remove` deletes them.
5. `npm run dev`, then open http://localhost:3002

## Where things live

- `src/lib/config.ts`: the app name, the buyer protection fee and other rules, all in one place
- `src/lib/catalog.ts`: departments and categories
- `src/app`: one folder per page
- `src/app/actions`: what happens when you press a button (sign in, post a listing, follow…)
- `supabase/migrations`: the database design and its security rules
