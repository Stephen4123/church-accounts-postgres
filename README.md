# IPC Horeb Church Accounts Management & Financial Portal

A full-stack, enterprise-grade Church Accounts Portal built with **TypeScript**, **Node.js (Express)**, and **PostgreSQL**, configured for seamless deployment on **Render**.

---

## 🌟 Key Features

1. **Executive Financial Dashboard & Dynamic Balance Sheet**:
   - **Total Church Reserves**: Dynamic live aggregation of `Cash in Hand + SBI Current + SBI Fixed Deposit`.
   - **Cash in Hand**: Computed automatically from opening balance + Receipts − Payments.
   - **SBI Current Account & SBI Fixed Deposit (FD)**: Real-time balance tracking, contra handling, interest, and deposits/withdrawals.
   - **Income vs. Expenditure**: Full categoric breakdown with Net Surplus / Deficit.
   - **Financial Year Switching**: Filter all ledgers and balances seamlessly across financial years (e.g., `2026-2027`, `2025-2026`).

2. **Voucher & Receipt Entry System**:
   - Fast entry for **Receipts (Income)** and **Payment Vouchers (Expenses)**.
   - Automatic Voucher Numbering: `R-XXXX` (Cash Receipt), `P-XXXX` (Cash Payment), `R-XXXX/B` (Bank Receipt), `P-XXXX/B` (Bank Payment).
   - Contra Transaction Support: Direct cash deposit to bank or withdrawal with dual-book auto reconciliation.
   - Direct Member search and autocomplete.
   - One-click **"Save & Print"** generating formal church vouchers with official seal and signatures.

3. **Books of Account**:
   - **Cash Book**: Running balance column, opening balance carry-forward, date filtering, print-ready format.
   - **Bank Book**: Multi-account management (SBI Current, SBI FD), deposits, withdrawals, cheques, and reconciliation.
   - **General Ledger**: Grouped by account head with debit/credit breakdown and head balances.

4. **Church Members Directory & Tithes**:
   - Member profile directory with member codes (`H-101`, `H-102`, etc.).
   - Instant Member Statements with detailed contribution history.
   - One-click WhatsApp sharing and public link generation (`/H-101`).

5. **Monthly Subscriptions Matrix**:
   - Grid of members against all 12 financial year months (April to March) showing paid amounts and dues.

6. **Role-Based Access Control (RBAC)**:
   - **Admin**: Full administrative permissions, user management, opening balances configuration.
   - **Treasurer**: Operational financial entries, edits, vouchers, and reconciliations.
   - **President / Secretary / Committee Member**: Read-only access to dashboards, reports, and ledgers.

7. **Public Document Verification Viewer (`/R-...`, `/P-...`, `/H-...`)**:
   - Clean, verified public URL routes for church vouchers and member statements.
   - Displays official Church Seal, Letterhead, and Digital Signatures of President, Secretary, and Treasurer.

---

## 🛠️ Technology Stack

- **Backend**: TypeScript, Node.js, Express, `pg` (node-postgres pool), `bcryptjs`, `jsonwebtoken`
- **Database**: PostgreSQL (with auto-migrating DDL in `schema.sql` and local offline fallback)
- **Frontend**: Vanilla Modern JavaScript, Emerald & Slate Glassmorphic CSS design system, Google Fonts
- **Deployment**: Render Blueprint (`render.yaml`) & Dockerfile

---

## 🚀 Deployment to Render (1-Click Blueprint)

1. Push this repository to GitHub or GitLab.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Select your repository. Render will automatically detect [`render.yaml`](file:///c:/Users/user/Downloads/Church%20accounts%20IPC/church_portal/render.yaml) and provision:
   - **Web Service**: Node.js & TypeScript web service with build command `npm install && npm run build` and start command `npm start`.
   - **Managed PostgreSQL Database**: `church-accounts-db` automatically connected via `DATABASE_URL`.
4. Click **Apply**. Render will build and deploy the entire portal with database tables and seed data automatically!

---

## 💻 Local Development

1. Navigate to the project directory:
   ```bash
   cd church_portal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Configure PostgreSQL in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/church_accounts
   PORT=5000
   JWT_SECRET=church_secret_key_2026
   ```
   *Note: If `DATABASE_URL` is omitted, the app starts with its built-in local persistence store so you can test immediately without setting up PostgreSQL.*

4. Run development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   npm start
   ```

---

## 🔑 Migrated Officer Credentials (Password: `admin123`)

- **Admin**: `stephensam2001@gmail.com` (Stephen Sam Simon)
- **Treasurer**: `rajuabram@yahoo.com` (Raju Abraham)
- **President**: `ttsimonranny@gmail.com` (Pr. T.T. Simon)
- **Committee Member**: `stephensamsimon@gmail.com` (Stephen Sam Simon)

