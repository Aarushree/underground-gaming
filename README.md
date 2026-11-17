# 🎮 Underground
### *A Gaming Playstation*

A production-ready, full-stack web app for a gaming café featuring **real-time station tracking** and a **loyalty rewards system** — built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Live Station Board** | 4 stations (Table 1, Table 2, Console 1 (PlayStation), Console 2 (PlayStation)) with real-time FREE/BOOKED status via Supabase Realtime WebSockets |
| **Admin Toggle** | Admins tap any station card to instantly flip its status across all connected devices |
| **Loyalty Rewards** | Spend ₹1,000 → earn 1 Free Hour, tracked atomically in PostgreSQL |
| **Customer Wallet** | Live progress bar toward the next milestone, free hours balance |
| **Admin Terminal** | Search customer by phone, add bill amounts, redeem free hours — all with real-time preview |
| **Role-Based Access** | `CUSTOMER` and `ADMIN` roles enforced via Supabase RLS policies and `SECURITY DEFINER` RPC functions |
| **Mobile-First** | Optimized for QR code scan at the counter on any phone |

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### 2. Clone & Install

```bash
git clone <your-repo>
cd underground-gaming
npm install
```

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> Find these in your Supabase dashboard under **Project Settings → API**.

### 4. Run the SQL Migration

1. Open your Supabase project → **SQL Editor**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run**

This creates all tables, RLS policies, RPC functions, triggers, and seeds the 4 stations.

### 5. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🛡️ Promoting the First Admin

After running the migration and signing up your first admin user through the app:

```sql
-- Run in Supabase SQL Editor
UPDATE public.profiles
SET role = 'ADMIN'
WHERE phone = 'your-admin-phone-number';
```

The user will gain admin capabilities immediately on next page load.

---

## 📂 Project Structure

```
underground-gaming/
├── src/
│   ├── app/
│   │   ├── globals.css          # Tailwind + custom CSS
│   │   ├── layout.tsx           # Root layout with metadata
│   │   └── page.tsx             # Main app page (auth-aware)
│   ├── components/
│   │   ├── Header.tsx           # Sticky nav with user menu
│   │   ├── AuthForm.tsx         # Sign in / Sign up form
│   │   ├── LiveStations.tsx     # Real-time station cards
│   │   ├── CustomerWallet.tsx   # Loyalty wallet (customers)
│   │   └── AdminTerminal.tsx    # Counter terminal (admins)
│   └── lib/
│       ├── supabase.ts          # Supabase browser client
│       └── types.ts             # TypeScript types & DB schema
├── supabase/
│   └── schema.sql               # Full DB migration
├── .env.example                 # Environment variable template
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🗄️ Database Schema

```
profiles        – Customer accounts, loyalty balances, role
stations        – 4 gaming stations with live status
loyalty_logs    – Audit trail: every bill add & redemption
```

### Key RPC Functions (called from the app)

| Function | Description |
|---|---|
| `add_customer_spend(customer_id, amount_inr)` | Atomically adds spend, awards free hours, logs the action |
| `redeem_free_hour(customer_id)` | Deducts 1 free hour, logs the redemption |
| `toggle_station_status(station_id)` | Flips FREE ↔ BOOKED for a station |

---

## 🔐 Security

- All balance mutations happen inside `SECURITY DEFINER` PostgreSQL functions that verify `role = 'ADMIN'` before executing — the client can never bypass this.
- RLS policies enforce row-level isolation for all tables.
- Supabase Realtime is scoped to only the `stations` and `profiles` tables.

---

## 🌐 Deployment (Vercel)

```bash
npm run build
```

Then push to GitHub and import the repo into [Vercel](https://vercel.com). Set the two environment variables in Vercel's dashboard and deploy.

---

## 📱 QR Code Usage

Generate a QR code pointing to your deployed URL and place it at the counter. Customers scan it, sign up once, and can track their loyalty balance from any session.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

---

*Built with ❤️ for Underground A Gaming Playstation*
