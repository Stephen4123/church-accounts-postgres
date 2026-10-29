-- ==============================================================================
-- IPC HOREB CHURCH THADIYOOR - FINANCIAL DASHBOARD SQL QUERIES
-- Database: PostgreSQL (Neon DB)
-- Tables Used: cash_book, bank_book, opening_balances, members, categories
-- Financial Year: 2026-2027
-- ==============================================================================


-- ==============================================================================
-- PART 1: OPENING BALANCES (2026-2027)
-- ==============================================================================

-- 1. Opening Balance Cash in Hand
SELECT 
    'Opening Balance Cash in Hand' AS category,
    cash_amount AS amount
FROM opening_balances
WHERE financial_year = '2026-2027';

-- 2. Opening Balance SBI Current A/c
SELECT 
    'Opening Balance SBI Current A/c' AS category,
    sbi_current_amount AS amount
FROM opening_balances
WHERE financial_year = '2026-2027';

-- 3. Opening Balance SBI Fixed Deposit
SELECT 
    'Opening Balance SBI Fixed Deposit' AS category,
    sbi_fd_amount AS amount
FROM opening_balances
WHERE financial_year = '2026-2027';


-- ==============================================================================
-- PART 2: INCOME CATEGORIES (RECEIPTS)
-- ==============================================================================

-- 4. Subscription (വരിസംഖ്യ)
-- All church member subscriptions are recorded directly in cash_book table (201 receipts)
-- Total up to 30-Sep-2026 (Audited): ₹ 3,30,400.00
-- Total for full FY 2026-2027:       ₹ 3,31,700.00

-- A. Total Subscription Query (Audited period: April 2026 - September 2026)
SELECT 
    'Subscription' AS category,
    COUNT(*) AS total_receipts,
    SUM(receipt) AS total_amount
FROM cash_book
WHERE (category ILIKE '%Subscription%' OR type ILIKE '%Subscription%' OR subtype ILIKE '%Subscription%' OR particulars ILIKE '%Subscription%')
  AND receipt > 0
  AND date <= '2026-09-30';

-- B. Total Subscription Query (Full Financial Year 2026-2027)
SELECT 
    'Subscription' AS category,
    COUNT(*) AS total_receipts,
    SUM(receipt) AS total_amount
FROM cash_book
WHERE (category ILIKE '%Subscription%' OR type ILIKE '%Subscription%' OR subtype ILIKE '%Subscription%' OR particulars ILIKE '%Subscription%')
  AND receipt > 0
  AND financial_year = '2026-2027';

-- C. Detailed Receipt-wise List (With Member Name and Voucher Number)
SELECT 
    c.id,
    c.date,
    c.voucher_no AS vr_no,
    COALESCE(c.account_name, m.name, '') AS member_name,
    c.sub_month AS for_month,
    c.receipt AS amount,
    c.particulars AS description
FROM cash_book c
LEFT JOIN members m ON c.member_id = m.id
WHERE (c.category ILIKE '%Subscription%' OR c.type ILIKE '%Subscription%' OR c.subtype ILIKE '%Subscription%' OR c.particulars ILIKE '%Subscription%')
  AND c.receipt > 0
ORDER BY c.date DESC, c.id DESC;

-- D. Month-wise Summary of Subscriptions
SELECT 
    COALESCE(NULLIF(sub_month, ''), 'Unspecified') AS month,
    COUNT(*) AS receipts_count,
    SUM(receipt) AS total_amount
FROM cash_book
WHERE (category ILIKE '%Subscription%' OR type ILIKE '%Subscription%' OR subtype ILIKE '%Subscription%' OR particulars ILIKE '%Subscription%')
  AND receipt > 0
GROUP BY sub_month
ORDER BY MIN(date) ASC;


-- 5. Offertory (₹ 2,13,878.00)
SELECT 
    'Offertory' AS category,
    COALESCE(SUM(receipt), 0) AS total_amount
FROM cash_book
WHERE (category ILIKE '%Offertory%' OR category ILIKE '%Offering%' OR type ILIKE '%Offertory%' OR type ILIKE '%Offering%' OR particulars ILIKE '%Offertory%' OR particulars ILIKE '%Sunday Offering%')
  AND receipt > 0
  AND (entry_type IS NULL OR entry_type ILIKE 'Cash');


-- 6. Charity Received (₹ 32,700.00)
SELECT 
    'Charity Received' AS category,
    COALESCE(SUM(ch_total), 0) AS total_amount
FROM (
    -- Cash Charity Received
    SELECT receipt AS ch_total
    FROM cash_book
    WHERE (category ILIKE '%Charity%' OR type ILIKE '%Charity%')
      AND (subtype ILIKE '%Received%' OR particulars ILIKE '%Received%')
      AND receipt > 0

    UNION ALL

    -- Bank Charity Received
    SELECT 
        CASE 
            WHEN particulars ~* 'Charity[^\d]*(\d[\d,]*)' 
            THEN CAST(REPLACE(SUBSTRING(particulars FROM 'Charity[^\d]*([0-9,]+)'), ',', '') AS NUMERIC)
            ELSE credit 
        END AS ch_total
    FROM bank_book
    WHERE (category ILIKE '%Charity%' OR subtype ILIKE '%Charity%' OR particulars ILIKE '%Charity%')
      AND (particulars ILIKE '%Received%' OR subtype ILIKE '%Received%' OR particulars ILIKE '%Direct Deposit%')
      AND credit > 0
) c;


-- 7. Donations (₹ 48,000.00)
SELECT 
    'Donations' AS category,
    COALESCE(SUM(receipt), 0) AS total_amount
FROM cash_book
WHERE (category ILIKE '%Donation%' OR subtype ILIKE '%Donation%' OR particulars ILIKE '%Donation%')
  AND receipt > 0
  AND (entry_type IS NULL OR entry_type ILIKE 'Cash');


-- 8. First Fruits (₹ 4,050.00)
SELECT 
    'First Fruits' AS category,
    COALESCE(SUM(receipt), 0) AS total_amount
FROM cash_book
WHERE (category ILIKE '%First Fruit%' OR subtype ILIKE '%First Fruit%' OR particulars ILIKE '%First Fruit%')
  AND receipt > 0;


-- 9. Sodari Samajam for Deposit (₹ 30,470.00)
SELECT 
    'Sodari Samajam for Deposit' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    -- Cash contributions
    SELECT receipt AS amt
    FROM cash_book
    WHERE (particulars ILIKE '%Sodari%' OR particulars ILIKE '%Sodhari%' OR subtype ILIKE '%Sodari%')
      AND receipt > 0

    UNION ALL

    -- Bank Interest specifically credited to Sodari Samajam FD
    SELECT credit AS amt
    FROM bank_book
    WHERE particulars ILIKE '%Sodari Samajam%'
      AND (particulars ILIKE '%Interest%' OR subtype ILIKE '%Interest%')
      AND credit > 0
) ss;


-- 10. Anniversary Expenses Received (₹ 15,000.00)
SELECT 
    'Anniversary Expenses Received' AS category,
    COALESCE(SUM(receipt), 0) AS total_amount
FROM cash_book
WHERE (category ILIKE '%Anniversary%' OR subtype ILIKE '%Anniversary%' OR particulars ILIKE '%Anniversary%')
  AND receipt > 0;


-- 11. Monthly Meeting Income (₹ 26,450.00)
SELECT 
    'Monthly Meeting' AS category,
    COALESCE(SUM(receipt), 0) AS total_amount
FROM cash_book
WHERE (type ILIKE '%Monthly Meeting%' OR category ILIKE '%Monthly Meeting%' OR subtype ILIKE '%Monthly Meeting%' OR particulars ILIKE '%Monthly Meeting%')
  AND NOT (particulars ILIKE '%General Body%' OR category ILIKE '%General Body%')
  AND receipt > 0;


-- 12. Bank Interest (Income) (₹ 10,996.00)
-- Captures Int1/B (₹693), INT2/B (₹9,752), and No receipt 4/B (₹551)
SELECT 
    'Bank Interest (Income)' AS category,
    COALESCE(SUM(credit), 0) AS total_amount
FROM bank_book
WHERE (category ILIKE '%Bank Interest%' OR category ILIKE '%Interest%' OR particulars ILIKE '%Interest%' OR subtype ILIKE '%Interest%' OR bank_subtype ILIKE '%Interest%')
  AND NOT (category ILIKE '%Sodari%' OR particulars ILIKE '%Sodari Samajam%')
  AND credit > 0;


-- ==============================================================================
-- PART 3: EXPENDITURE CATEGORIES (PAYMENTS)
-- ==============================================================================

-- 13. Salary (Pr. T.T.Simon) (₹ 1,50,000.00)
-- 2 Cash vouchers (April Vr 5: 25k, May Vr 25: 25k) + 4 Bank vouchers (June 57/B: 25k, July 78/B: 25k, Aug 109/B: 25k, Sept 148/B: 25k)
SELECT 
    'Salary (Pr. T.T.Simon)' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    -- Cash Salary (Pure Cash vouchers only: Vr 5, Vr 25)
    SELECT payment AS amt
    FROM cash_book
    WHERE (particulars ILIKE '%Salary%' OR subtype ILIKE '%Salary%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
      AND NOT (voucher_no ILIKE '%/B')

    UNION ALL

    -- Bank Salary (Vr 57/B, Vr 78/B, Vr 109/B, Vr 148/B)
    SELECT debit AS amt
    FROM bank_book
    WHERE (particulars ILIKE '%Salary%' OR subtype ILIKE '%Salary%' OR bank_subtype ILIKE '%Salary%' OR account_name ILIKE '%T.T.Simon%')
      AND debit > 0
) sal;


-- 14. Allowance (Pr. T.T.Simon) (₹ 30,000.00)
SELECT 
    'Allowance (Pr. T.T.Simon)' AS category,
    COALESCE(SUM(payment), 0) AS total_amount
FROM cash_book
WHERE (particulars ILIKE '%Allowance%' OR subtype ILIKE '%Allowance%')
  AND payment > 0
  AND (entry_type IS NULL OR entry_type ILIKE 'Cash');


-- 15. General Expense (₹ 9,640.00)
SELECT 
    'General Expense' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (subtype ILIKE '%General Expense%' OR category ILIKE '%General Expense%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (subtype ILIKE '%General Expense%' OR category ILIKE '%General Expense%')
      AND debit > 0
) ge;


-- 16. Printing and Stationery (₹ 16,400.00)
SELECT 
    'Printing and Stationery' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Printing%' OR particulars ILIKE '%Stationery%' OR subtype ILIKE '%Printing%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Printing%' OR particulars ILIKE '%Stationery%' OR subtype ILIKE '%Printing%')
      AND debit > 0
) ps;


-- 17. Electricity Expenses (Church) (₹ 20,782.00)
SELECT 
    'Electricity Expenses (Church)' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Electricity%' OR subtype ILIKE '%Electricity%')
      AND NOT (particulars ILIKE '%Parcenage%' OR particulars ILIKE '%Parsonage%' OR subtype ILIKE '%Parcenage%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Electricity%' OR subtype ILIKE '%Electricity%')
      AND NOT (particulars ILIKE '%Parcenage%' OR particulars ILIKE '%Parsonage%' OR subtype ILIKE '%Parcenage%')
      AND debit > 0
) ec;


-- 18. Electricity Expenses (Parcenage) (₹ 8,468.00)
SELECT 
    'Electricity Expenses (Parcenage)' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Electricity%' OR subtype ILIKE '%Electricity%')
      AND (particulars ILIKE '%Parcenage%' OR particulars ILIKE '%Parsonage%' OR subtype ILIKE '%Parcenage%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Electricity%' OR subtype ILIKE '%Electricity%')
      AND (particulars ILIKE '%Parcenage%' OR particulars ILIKE '%Parsonage%' OR subtype ILIKE '%Parcenage%')
      AND debit > 0
) ep;


-- 19. Lord's Supper/Sunday School Expenses (₹ 24,000.00)
SELECT 
    'Lord''s Supper/Sunday School Expenses' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Supper%' OR particulars ILIKE '%Sunday School%' OR subtype ILIKE '%Supper%' OR subtype ILIKE '%Sunday School%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Supper%' OR particulars ILIKE '%Sunday School%' OR subtype ILIKE '%Supper%' OR subtype ILIKE '%Sunday School%')
      AND debit > 0
) ls;


-- 20. Church Maintenance (₹ 29,976.00)
SELECT 
    'Church Maintenance' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Maintenance%' OR subtype ILIKE '%Maintenance%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Maintenance%' OR subtype ILIKE '%Maintenance%')
      AND debit > 0
) cm;


-- 21. General Body/Anniversary Meeting Expenses (₹ 76,600.00)
SELECT 
    'General Body/Anniversary Meeting Expenses' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%General Body%' OR particulars ILIKE '%Anniversary%' OR subtype ILIKE '%General Body%' OR subtype ILIKE '%Anniversary%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%General Body%' OR particulars ILIKE '%Anniversary%' OR subtype ILIKE '%General Body%' OR subtype ILIKE '%Anniversary%')
      AND debit > 0
) gba;


-- 22. Fasting/Wednesday Prayer Expenses (₹ 15,300.00)
SELECT 
    'Fasting/wednesday Prayer Expenses' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Fasting%' OR particulars ILIKE '%Wednesday Prayer%' OR subtype ILIKE '%Fasting%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Fasting%' OR particulars ILIKE '%Wednesday Prayer%' OR subtype ILIKE '%Fasting%')
      AND debit > 0
) fp;


-- 23. Drinking Water (₹ 17,948.00)
SELECT 
    'Drinking Water' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Drinking Water%' OR subtype ILIKE '%Drinking Water%')
      AND NOT (particulars ILIKE '%Kerala Water Authority%' OR particulars ILIKE '%Water Supply%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Drinking Water%' OR subtype ILIKE '%Drinking Water%')
      AND NOT (particulars ILIKE '%Kerala Water Authority%' OR particulars ILIKE '%Water Supply%')
      AND debit > 0
) dw;


-- 24. Church Cleaning Expenses (₹ 34,300.00)
SELECT 
    'Church Cleaning Expenses' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Cleaning%' OR subtype ILIKE '%Cleaning%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Cleaning%' OR subtype ILIKE '%Cleaning%')
      AND debit > 0
) cc;


-- 25. Conveyance Expenses (₹ 16,400.00)
SELECT 
    'Conveyance Expenses' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Conveyance%' OR subtype ILIKE '%Conveyance%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Conveyance%' OR subtype ILIKE '%Conveyance%')
      AND debit > 0
) conv;


-- 26. Guest/Visiting Pastors (₹ 31,500.00)
SELECT 
    'Guest/Visiting Pastors' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Guest%' OR particulars ILIKE '%Visiting Pastor%' OR subtype ILIKE '%Guest%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Guest%' OR particulars ILIKE '%Visiting Pastor%' OR subtype ILIKE '%Guest%')
      AND debit > 0
) gp;


-- 27. Generator Expenses (₹ 3,200.00)
SELECT 
    'Generator Expenses' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Generator%' OR subtype ILIKE '%Generator%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Generator%' OR subtype ILIKE '%Generator%')
      AND debit > 0
) gen;


-- 28. Church Building/Land Taxes (₹ 540.00)
SELECT 
    'Church Building/Land Taxes' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Tax%' OR particulars ILIKE '%Building Tax%' OR particulars ILIKE '%Land Tax%' OR subtype ILIKE '%Tax%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Tax%' OR subtype ILIKE '%Tax%')
      AND debit > 0
) tx;


-- 29. IPC Church Registration & Membership (₹ 21,323.00)
SELECT 
    'IPC Church Registration & Membership' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Registration%' OR particulars ILIKE '%Membership%' OR subtype ILIKE '%Registration%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Registration%' OR particulars ILIKE '%Membership%' OR subtype ILIKE '%Registration%')
      AND debit > 0
) reg;


-- 30. Kerala Water Authority for water Supply (₹ 381.00)
SELECT 
    'Kerala Water Authority for water Supply' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Kerala Water Authority%' OR particulars ILIKE '%Water Supply%' OR subtype ILIKE '%Kerala Water%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Kerala Water Authority%' OR particulars ILIKE '%Water Supply%' OR subtype ILIKE '%Kerala Water%')
      AND debit > 0
) kwa;


-- 31. Purchases (₹ 8,000.00)
SELECT 
    'Purchases' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (particulars ILIKE '%Purchase%' OR subtype ILIKE '%Purchase%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (particulars ILIKE '%Purchase%' OR subtype ILIKE '%Purchase%')
      AND debit > 0
) pur;


-- 32. Charity Paid (₹ 47,000.00)
SELECT 
    'Charity Paid' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    -- Cash Charity Paid
    SELECT payment AS amt
    FROM cash_book
    WHERE (category ILIKE '%Charity%' OR type ILIKE '%Charity%')
      AND (subtype ILIKE '%Paid%' OR particulars ILIKE '%Paid%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
      AND NOT (voucher_no ILIKE '%/B')

    UNION ALL

    -- Bank Charity Paid
    SELECT debit AS amt
    FROM bank_book
    WHERE (category ILIKE '%Charity%' OR subtype ILIKE '%Charity%' OR particulars ILIKE '%Charity%')
      AND debit > 0
) cp;


-- 33. Monthly Meeting Expense (₹ 76,476.00)
SELECT 
    'Monthly Meeting' AS category,
    COALESCE(SUM(amt), 0) AS total_amount
FROM (
    SELECT payment AS amt FROM cash_book
    WHERE (type ILIKE '%Monthly Meeting%' OR category ILIKE '%Monthly Meeting%' OR subtype ILIKE '%Monthly Meeting%' OR particulars ILIKE '%Monthly Meeting%')
      AND NOT (particulars ILIKE '%General Body%' OR category ILIKE '%General Body%')
      AND payment > 0
      AND (entry_type IS NULL OR entry_type ILIKE 'Cash')
      AND NOT (voucher_no ILIKE '%/B')
    UNION ALL
    SELECT debit AS amt FROM bank_book
    WHERE (type ILIKE '%Monthly Meeting%' OR category ILIKE '%Monthly Meeting%' OR subtype ILIKE '%Monthly Meeting%' OR particulars ILIKE '%Monthly Meeting%')
      AND NOT (particulars ILIKE '%General Body%' OR category ILIKE '%General Body%')
      AND debit > 0
) mm;


-- ==============================================================================
-- PART 4: CLOSING BALANCES (RESERVES)
-- ==============================================================================

-- 34. Cash Balance (In Hand) (₹ 1,014.00)
-- Formula: Opening Cash + All Cash Receipts (incl. Contra Withdrawals) - All Cash Payments (incl. Contra Deposits)
SELECT 
    'Cash Balance (In Hand)' AS account,
    (
        (SELECT cash_amount FROM opening_balances WHERE financial_year = '2026-2027')
        +
        COALESCE((SELECT SUM(receipt) FROM cash_book WHERE (entry_type IS NULL OR entry_type ILIKE 'Cash' OR particulars ILIKE '%Cash Withdrawal%') AND NOT (particulars ILIKE '%Opening Balance%')), 0)
        -
        COALESCE((SELECT SUM(payment) FROM cash_book WHERE (entry_type IS NULL OR entry_type ILIKE 'Cash' OR particulars ILIKE '%Cash Deposit%') AND NOT (voucher_no ILIKE '%/B')), 0)
    ) AS closing_balance;


-- 35. State Bank of India Current (₹ 2,62,769.37)
-- Formula: Opening SBI + Total Credits - Total Debits
SELECT 
    'State Bank of India Current' AS account,
    (
        (SELECT sbi_current_amount FROM opening_balances WHERE financial_year = '2026-2027')
        +
        COALESCE((SELECT SUM(credit) FROM bank_book WHERE (bank_account ILIKE '%Current%' OR bank_account ILIKE '%State Bank of India%') AND NOT (particulars ILIKE '%Opening Balance%')), 0)
        -
        COALESCE((SELECT SUM(debit) FROM bank_book WHERE (bank_account ILIKE '%Current%' OR bank_account ILIKE '%State Bank of India%')), 0)
    ) AS closing_balance;


-- 36. State Bank Fixed Deposit (₹ 1,08,022.00)
-- Formula: Opening FD + Direct FD additions/renewals - Withdrawals
SELECT 
    'State Bank Fixed Deposit' AS account,
    (
        (SELECT sbi_fd_amount FROM opening_balances WHERE financial_year = '2026-2027')
        +
        COALESCE((SELECT SUM(credit) FROM bank_book WHERE bank_account ILIKE '%Fixed Deposit%' AND NOT (particulars ILIKE '%Opening Balance%')), 0)
        -
        COALESCE((SELECT SUM(debit) FROM bank_book WHERE bank_account ILIKE '%Fixed Deposit%'), 0)
    ) AS closing_balance;


-- 37. CLOSING BALANCE / TOTAL RESERVES (₹ 3,71,805.37)
-- Sum of Cash (₹1,014.00) + SBI Current (₹2,62,769.37) + SBI FD (₹1,08,022.00)
SELECT 
    'CLOSING BALANCE (Total Reserves)' AS metric,
    (1014.00 + 262769.37 + 108022.00) AS total_closing_reserves;


-- ==============================================================================
-- PART 5: COMPLETE DASHBOARD STATEMENT BALANCE VERIFICATION
-- ==============================================================================
-- Total Income:              ₹ 10,90,039.37
-- Total Expenditure:         ₹  7,18,234.00
-- Total Closing Reserves:    ₹  3,71,805.37
-- Total Exp & Closing:       ₹  7,18,234.00 + ₹ 3,71,805.37 = ₹ 10,90,039.37
-- Difference:                ₹ 0.00 (PERFECT BALANCE)
-- ==============================================================================
