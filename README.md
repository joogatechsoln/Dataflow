# DataFlow Suite — Web

> The full DataFlow Suite analytics platform, running entirely in the browser.
> No install, no desktop app — just a Vercel URL you can share.

## ✨ Features

- **6-step data pipeline** — Define → Collect → Clean → Analyze → Visualize → Report
- **Real SQL in the browser** — DuckDB-WASM, no server required
- **Python notebook** — Pyodide (pandas, numpy) in the browser
- **CSV / Excel / JSON** — drag-and-drop file import
- **AI Assistant** — GPT-4o powered, bring your own API key
- **Team workspaces** — Supabase-backed collaboration
- **PDF & PowerPoint export** — pdf-lib + pptxgenjs, client-side
- **Command palette** — Ctrl+K to navigate anywhere

---

## 🚀 Deploy to Vercel (5 minutes)

### 1. Clone & push to GitHub

```bash
git clone https://github.com/your-org/dataflow-web
cd dataflow-web
git remote set-url origin https://github.com/YOUR_USERNAME/dataflow-web.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Vercel auto-detects Vite — leave framework as **Vite**
4. Add environment variables (see below)
5. Click **Deploy** — done in ~2 minutes

### 3. Environment variables (add in Vercel dashboard)

| Variable | Value | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase → Settings → API |
| `VITE_PLAUSIBLE_DOMAIN` | `yourdomain.com` | Optional — Plausible dashboard |

### 4. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase_schema.sql`
3. Enable **Email auth** under Authentication → Providers
4. (Optional) Enable **Google** and **GitHub** OAuth
5. Under Authentication → URL Configuration, add your Vercel URL to **Redirect URLs**

---

## 💻 Local development

```bash
# Install dependencies
npm install

# Copy env file and fill in your Supabase keys
cp .env.example .env

# Start dev server
npm run dev
# → http://localhost:3000
```

> **Note:** DuckDB-WASM requires `Cross-Origin-Opener-Policy: same-origin` headers.
> The dev server sets these automatically. In production Vercel handles it via `vercel.json`.

---

## 🏗 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| State | Zustand (persisted to localStorage) |
| Routing | React Router v6 |
| SQL engine | DuckDB-WASM (runs in browser) |
| Python | Pyodide v0.26 (loaded on demand) |
| Auth + DB | Supabase |
| Local storage | IndexedDB via `idb` |
| PDF export | pdf-lib |
| PPTX export | pptxgenjs |
| Charts | Apache ECharts |
| AI | OpenAI GPT-4o (user's own API key) |
| Hosting | Vercel |

---

## 📁 Project structure

```
src/
├── App.tsx                         # Root — auth gate, shell, shortcuts
├── main.tsx                        # React entry point
├── index.css                       # Design system tokens + utilities
├── lib/
│   ├── db.ts                       # IndexedDB (projects, files, cache)
│   ├── duckdb.ts                   # DuckDB-WASM singleton + query helpers
│   ├── fileImport.ts               # CSV/Excel/JSON → DuckDB registration
│   ├── supabase.ts                 # Supabase client + all DB helpers
│   ├── useCloudSync.ts             # Real-time project sync hook
│   ├── useLicense.ts               # Plan/trial/Pro feature gates
│   ├── useShortcuts.ts             # Global keyboard shortcut registry
│   ├── analytics.ts                # Plausible opt-in event logger
│   ├── RealPDFExport.ts            # pdf-lib PDF generation
│   └── RealPPTXExport.ts           # pptxgenjs PPTX generation (Pro)
├── store/
│   ├── projectStore.ts             # Projects + pipeline state (Zustand)
│   ├── authStore.ts                # User auth + settings
│   ├── licenseStore.ts             # Plan, trial, license key
│   ├── notifStore.ts               # In-app notifications
│   ├── teamStore.ts                # Team workspace state
│   └── pluginStore.ts              # Installed plugins
├── components/
│   ├── Sidebar/                    # Navigation sidebar
│   ├── TopBar/                     # Tab bar + actions
│   ├── AIAssistant/                # GPT-4o chat panel
│   ├── CommandPalette/             # Ctrl+K palette
│   ├── Notifications/              # Notification feed
│   ├── ErrorBoundary/              # Global + per-component error UI
│   ├── GuidedMode/                 # Beginner hint overlays
│   └── ui/                         # ProGate, VirtualList, etc.
└── pages/
    ├── Auth/                       # Login + register
    ├── Dashboard/                  # Project list
    ├── Pipeline/
    │   ├── Define/                 # Problem statement
    │   ├── Collect/                # File upload → DuckDB
    │   ├── Clean/                  # Data quality tools
    │   ├── Analyze/                # SQL + Python + Spreadsheet
    │   ├── Visualize/              # Chart builder
    │   └── Report/                 # Export PDF/PPTX
    ├── Learn/                      # Learning hub
    ├── Team/                       # Team workspace
    ├── Admin/                      # Admin dashboard
    ├── Marketplace/                # Plugin store
    └── Settings/                   # User + billing settings
```

---

## 🔑 Licensing

**Solo** — Free, all 6 pipeline steps, CSV/Excel/JSON  
**Pro** — $49 one-time, all chart types, PDF/PPTX export, AI assistant, Power BI embed  
**Team** — $99/seat, team workspaces, roles, admin dashboard, version history

Purchase via LemonSqueezy. License keys entered in Settings → Billing.

---

## 🗺 Roadmap

- [ ] Database connectors (PostgreSQL, MySQL via serverless proxy)
- [ ] Google Sheets import
- [ ] Collaborative real-time editing (Supabase Realtime)
- [ ] More chart types and Power BI integration
- [ ] Plugin API for community extensions
- [ ] Mobile-responsive layout
