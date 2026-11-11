# Inventory Planning & Forecasting Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Redux Toolkit](https://img.shields.io/badge/Redux%20Toolkit-2.5+-purple.svg)](https://redux-toolkit.js.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-ea2845.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)
[![AG Grid](https://img.shields.io/badge/AG%20Grid-36.2-brightgreen.svg)](https://www.ag-grid.com/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff.svg)](https://vitejs.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io/)

A full-stack monorepo application for **8-month rolling inventory planning and stockout risk forecasting** tailored for Amazon sellers (FBA, AWD, 3PL, and in-production pipelines).

This platform replaces cumbersome manual spreadsheet operations with a responsive, pixel-accurate web workspace featuring virtualized data grids, live scenario planning drawers, and deterministic calculation engines.

---

## Architecture Overview

The repository is organized as a high-performance TypeScript monorepo powered by `pnpm` workspaces:

```
inventory-planning/
├── packages/
│   └── shared/                 # Pure domain logic & math engine (@gno/shared)
│       ├── src/engine.ts       # Deterministic forecast & replenishment calculations
│       ├── src/types.ts        # Shared TypeScript domain contracts & DTOs
│       ├── src/constants.ts    # Model constants (8-mo horizon, 1.1x multiple, etc.)
│       ├── src/monthLabels.ts  # Rolling month header utilities
│       └── src/csv/            # CSV validation, fingerprinting, and header mapping
├── gnoCLient/                  # Frontend single-page application
│       ├── src/components/     # ProductsView, AnnualPlanView, AdjustPlanModal, KpiBar
│       ├── src/store/          # Redux Toolkit store, workspaceSlice, RTK Query API
│       ├── src/grid/           # AG Grid Community Quartz theme & configuration
│       └── src/index.css       # Design tokens & responsive styles
├── gnoApi/                     # Backend REST API
│       ├── src/forecast/       # Forecasting service & override persistence
│       ├── src/upload/         # Multipart CSV/XLSX streaming & parsing
│       ├── src/db/             # TypeORM entities (Session, Override, RawSales, RawInv)
│       └── src/workbook/       # Excel reconciliation & verification service
└── panda-planner-forecast-pkg/ # Reference datasets, sample CSVs, and Excel model
```

---

## Key Capabilities

### 1. Products Tab (Executive Overview)
- **High-Density Virtualized Grid**: Render thousands of SKUs smoothly using AG Grid Community Quartz.
- **8-Month Outlook Strip**: Compact color-coded tiles (Healthy, Below Buffer, Stockout Risk) with interactive breakdown tooltips (monthly forecast demand vs. ending inventory).
- **Inline Editing**: Real-time inline adjustments for 3PL warehouse units and in-production pipeline stock.
- **Actionable Reorder Guidance**: Automatically indicates the exact month a purchase order must be placed (`Order by`) and highlights immediate reorder needs in bold red (`Now`).
- **Replenishment Recommendations**: Computes `Units to order` via greedy buffer top-up algorithms.

### 2. Annual Plan Tab (Matrix Projection)
- **Stacked Monthly Projections**: Renders both forecasted unit sales and projected month-end stock per month across all 8 forward months.
- **Pinned Summary Row**: Real-time aggregation of catalog-wide sales demand and inventory health across every monthly period.

### 3. Scenario Planning Drawer ("Adjust Plan")
- **Per-SKU Tuning**: Adjust lead times (days), minimum safety buffer (months), and per-month growth multipliers.
- **Manual Purchase Orders**: Enter planned PO quantities per month and immediately see landed arrivals based on lead-time offsets.
- **1-Click "Suggest Orders"**: Automatically calculates and populates exact purchase order quantities required to keep all future months green.
- **Instant Client-Side Feedback**: Zero-latency recomputations in the browser before persisting to the PostgreSQL backend.

### 4. Shared Forecasting Engine (`@gno/shared`)
- **Single Source of Truth**: The mathematical model is executed identically in both client offline mode and the server database layer.
- **Zero Drift**: DTO schemas, data sanitization, and mathematical logic are shared across the wire with full TypeScript type safety.

---

## Forecast & Mathematical Model

The forecasting engine implements the verified Amazon inventory planning model:

1. **Horizon**: 8 calendar months starting from the current active month.
2. **Starting Inventory**:
   $$\text{Starting Inventory} = \text{FBA Total (Active + Reserved + Inbound + AWD)} + \text{3PL Units}$$
3. **Monthly Demand Forecast**:
   $$\text{Forecast Units}[m] = \text{round}(\text{Units Sold Last Year}[m] \times \text{Multiple}[m])$$
   *(Default multiplier: 1.1x vs. prior year)*
4. **Order Landing / Inbound Receipts**:
   $$\text{Landing Month} = m + \text{round}\left(\frac{\text{Lead Time Days}}{30}\right)$$
   *Units currently in production arrive in Month 1.*
5. **Month-End Ending Stock**:
   $$\text{Ending Stock}[m] = \text{Starting Stock}[m] + \text{Inbound}[m] - \text{Forecast Demand}[m]$$
6. **Health Classifications**:
   - **Green (Healthy)**: $\text{Ending Stock} > 0.25 \times \text{Avg Monthly Forecast} \times \text{Buffer Months}$
   - **Yellow (Below Buffer)**: $0 < \text{Ending Stock} \le 0.25 \times \text{Avg Monthly Forecast} \times \text{Buffer Months}$
   - **Red (Stockout Risk)**: $\text{Ending Stock} \le 0$
7. **Order-By Month**:
   $$\text{Order Month} = \max\left(0, \text{First Risk Month} - \text{round}\left(\frac{\text{Lead Time Days}}{30}\right)\right)$$
   *(Month 0 renders as "Now")*

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Monorepo** | pnpm workspaces |
| **Frontend** | React 19, TypeScript, Vite, Redux Toolkit, RTK Query, AG Grid Community |
| **Backend** | NestJS 11, TypeORM, PostgreSQL |
| **Shared** | Pure TypeScript (`@gno/shared`) |
| **Testing** | Jest, Supertest |
| **Parsing** | PapaParse (CSV streaming), XLSX (Excel validation) |

---

## Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **pnpm**: `v9.0.0` or higher (`npm install -g pnpm`)
- **PostgreSQL**: `v14+` running locally or accessible via URL

### 1. Clone & Install
```bash
git clone https://github.com/gno-qaisar/inventory-planning.git
cd inventory-planning

# Install all monorepo dependencies
pnpm install
```

### 2. Configure Database & Environment
By default, the backend connects to `postgresql://postgres:postgres@localhost:5432/gno_forecast`.

To configure a custom database connection, create `.env` in `gnoApi/`:
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/gno_forecast
PORT=3000
NODE_ENV=development
```

Ensure the target PostgreSQL database exists:
```bash
createdb gno_forecast
```

### 3. Run Development Servers

#### Start Backend (`gnoApi`)
```bash
cd gnoApi
pnpm start:dev
```
The NestJS API will start on `http://localhost:3000`.

#### Start Frontend (`gnoCLient`)
```bash
cd gnoCLient
pnpm dev
```
The Vite development server will start on `http://localhost:5173`.

---

## Available Scripts

From the repository root:

| Command | Action |
| :--- | :--- |
| `pnpm --filter gno-task start:dev` | Launch NestJS backend in hot-reload mode |
| `pnpm --filter gnoclient dev` | Launch Vite frontend development server |
| `pnpm --filter gno-task test` | Run all backend Jest unit & mathematical verification tests |
| `pnpm --filter gnoclient build` | Run TypeScript strict build & Vite production bundling |
| `pnpm --filter @gno/shared build` | Compile the shared domain package |

---

## Testing & Quality Assurance

All core forecast mathematics and workbook numbers are tested against reference Excel models:

```bash
# Run backend engine, controller, and workbook verification tests
cd gnoApi && pnpm test
```

Verification covers:
- Zero-drift parity against reference workbook calculations for PhraZor Taze.
- Fallback logic for SKUs missing prior-year sales history.
- Safety buffer threshold calculations and stockout tone determinations.
- Multipart CSV parsing, session persistence, and audit logging.

---

## License

Private and proprietary. Developed for GNO Inventory Planning operations.

