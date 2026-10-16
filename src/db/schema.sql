-- ============================================================================
-- IPC Horeb Church Accounts - Complete PostgreSQL Database Schema
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ROLES TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Committee Member', -- Admin, Treasurer, Secretary, President, Committee Member
    photo_url TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. MEMBERS DIRECTORY TABLE
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    member_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(50) DEFAULT '',
    nickname VARCHAR(100) DEFAULT '',
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    address TEXT DEFAULT '',
    family_head VARCHAR(255) DEFAULT '',
    photo_url TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'Active', -- Active, Inactive
    monthly_pledge NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BANK ACCOUNTS MASTER
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    account_name VARCHAR(255) UNIQUE NOT NULL,
    account_type VARCHAR(50) DEFAULT 'Current', -- Current, Fixed Deposit, Savings
    account_number VARCHAR(100) DEFAULT '',
    bank_name VARCHAR(100) DEFAULT 'State Bank of India',
    branch VARCHAR(100) DEFAULT '',
    ifsc_code VARCHAR(50) DEFAULT '',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SUBTYPES & ACCOUNT HEADS
CREATE TABLE IF NOT EXISTS subtypes (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- Income, Expense, Contra, Bank
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cat_name UNIQUE (category, name)
);

-- 5. OPENING BALANCES PER FINANCIAL YEAR
CREATE TABLE IF NOT EXISTS opening_balances (
    id SERIAL PRIMARY KEY,
    financial_year VARCHAR(20) UNIQUE NOT NULL, -- e.g. 2025-2026, 2026-2027
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    cash_amount NUMERIC(14, 2) DEFAULT 0.00,
    sbi_current_amount NUMERIC(14, 2) DEFAULT 0.00,
    sbi_fd_amount NUMERIC(14, 2) DEFAULT 0.00,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Receipt' or 'Payment'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_category_name_type UNIQUE (name, type)
);

-- 7. CASH BOOK TABLE
CREATE TABLE IF NOT EXISTS cash_book (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    voucher_no VARCHAR(50) DEFAULT '',
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    account_name VARCHAR(255) DEFAULT '',
    particulars TEXT DEFAULT '',
    receipt NUMERIC(12, 2) DEFAULT 0.00,
    payment NUMERIC(12, 2) DEFAULT 0.00,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    category VARCHAR(255) DEFAULT '',
    sub_month VARCHAR(50) DEFAULT '',
    bank_id BIGINT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. BANK BOOK TABLE
CREATE TABLE IF NOT EXISTS bank_book (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    cheque_no VARCHAR(50) DEFAULT '',
    voucher_no VARCHAR(50) DEFAULT '',
    bank_account VARCHAR(255) DEFAULT 'State Bank of India',
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    particulars TEXT DEFAULT '',
    credit NUMERIC(12, 2) DEFAULT 0.00,
    debit NUMERIC(12, 2) DEFAULT 0.00,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    category VARCHAR(255) DEFAULT '',
    sub_month VARCHAR(50) DEFAULT '',
    cash_id BIGINT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. PUBLIC SHARED VERIFICATION LINKS
CREATE TABLE IF NOT EXISTS shared_links (
    code VARCHAR(100) PRIMARY KEY,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 11. COMPATIBILITY VIEWS
DROP VIEW IF EXISTS transactions CASCADE;
DROP VIEW IF EXISTS bank_transactions CASCADE;

CREATE VIEW transactions AS
SELECT 
  c.id,
  c.date,
  c.voucher_no as vr_no,
  c.account_name,
  c.particulars as description,
  c.particulars,
  c.receipt as receipt_amount,
  c.payment as payment_amount,
  CASE WHEN c.receipt > 0 THEN c.receipt ELSE c.payment END as amount,
  CASE WHEN c.receipt > 0 THEN 'Receipt' ELSE 'Payment' END as mode,
  'Cash' as entry_type,
  c.category,
  c.category as type,
  c.category as subtype,
  c.category as sub_type,
  c.sub_month,
  c.member_id,
  m.member_code,
  m.address,
  m.phone,
  c.bank_id,
  c.balance,
  c.created_at,
  c.updated_at
FROM cash_book c
LEFT JOIN members m ON c.member_id = m.id;

CREATE OR REPLACE VIEW bank_transactions AS
SELECT
  b.id,
  b.date,
  b.voucher_no as vr_no,
  b.cheque_no,
  b.bank_account,
  b.bank_account as account,
  b.particulars as description,
  b.particulars,
  b.credit as receipt_amount,
  b.debit as payment_amount,
  CASE WHEN b.credit > 0 THEN b.credit ELSE b.debit END as amount,
  CASE WHEN b.credit > 0 THEN 'Credit (Receipt)' ELSE 'Debit (Payment)' END as mode,
  'Bank' as entry_type,
  b.category,
  b.category as bank_subtype,
  b.category as subtype,
  b.category as type,
  b.sub_month,
  b.member_id,
  m.member_code,
  m.name as account_name,
  b.cash_id,
  b.balance,
  b.created_at,
  b.updated_at
FROM bank_book b
LEFT JOIN members m ON b.member_id = m.id;

-- INDEXES FOR MAXIMUM SPEED & ZERO-LAG LOOKUPS
CREATE INDEX IF NOT EXISTS idx_members_code ON members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_title ON members(title);
CREATE INDEX IF NOT EXISTS idx_members_nickname ON members(nickname);
CREATE INDEX IF NOT EXISTS idx_cb_date ON cash_book(date);
CREATE INDEX IF NOT EXISTS idx_cb_vr_no ON cash_book(voucher_no);
CREATE INDEX IF NOT EXISTS idx_cb_member_id ON cash_book(member_id);
CREATE INDEX IF NOT EXISTS idx_cb_cat_id ON cash_book(category_id);
CREATE INDEX IF NOT EXISTS idx_bb_date ON bank_book(date);
CREATE INDEX IF NOT EXISTS idx_bb_member_id ON bank_book(member_id);
CREATE INDEX IF NOT EXISTS idx_bb_cat_id ON bank_book(category_id);
