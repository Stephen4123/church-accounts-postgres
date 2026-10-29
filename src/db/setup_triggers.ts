import { query, isPostgres } from './index';

export async function setupTriggers() {
  if (!isPostgres()) return;

  console.log('Setting up INSTEAD OF triggers for views...');

  // 1. Trigger function for transactions view (targeting cash_book)
  await query(`
    CREATE OR REPLACE FUNCTION trg_transactions_view_fn()
    RETURNS TRIGGER AS $$
    DECLARE
      v_member_id INT := NEW.member_id;
      v_cat_id INT;
      v_receipt NUMERIC(12,2) := 0.00;
      v_payment NUMERIC(12,2) := 0.00;
      v_account_name VARCHAR(255) := COALESCE(NEW.account_name, '');
      v_particulars TEXT := COALESCE(NEW.particulars, NEW.description, '');
      v_category VARCHAR(255) := COALESCE(NEW.category, NEW.type, 'General');
      v_type VARCHAR(100) := COALESCE(NEW.type, NEW.category, 'General');
      v_subtype VARCHAR(255) := COALESCE(NEW.subtype, NEW.sub_type, '');
      v_sub_month VARCHAR(50) := COALESCE(NEW.sub_month, '');
      v_entry_type VARCHAR(50) := COALESCE(NEW.entry_type, 'Cash');
      v_bank_account VARCHAR(255) := COALESCE(NEW.bank_account, 'State Bank of India');
      v_bank_subtype VARCHAR(255) := COALESCE(NEW.bank_subtype, '');
      v_is_cheque BOOLEAN := COALESCE(NEW.is_cheque, false);
      v_cheque_no VARCHAR(100) := COALESCE(NEW.cheque_no, '');
      v_member_code VARCHAR(50) := COALESCE(NEW.member_code, '');
      v_address TEXT := COALESCE(NEW.address, '');
      v_phone VARCHAR(50) := COALESCE(NEW.phone, '');
      v_transaction_id VARCHAR(100) := COALESCE(NEW.transaction_id, '');
      v_financial_year VARCHAR(20) := COALESCE(NEW.financial_year, '2026-2027');
      v_is_printed BOOLEAN := COALESCE(NEW.is_printed, false);
      v_is_cancelled BOOLEAN := COALESCE(NEW.is_cancelled, false);
      v_existing_id INT := NULL;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        -- Resolve member_id if missing
        IF v_member_id IS NULL AND v_account_name <> '' THEN
          SELECT id INTO v_member_id FROM members 
          WHERE LOWER(name) = LOWER(v_account_name) OR LOWER(member_code) = LOWER(v_member_code)
          LIMIT 1;
        END IF;

        -- Resolve category_id
        SELECT id INTO v_cat_id FROM categories WHERE LOWER(name) = LOWER(v_category) LIMIT 1;

        -- Calculate receipt / payment amounts
        IF NEW.mode = 'Receipt' OR (NEW.receipt_amount IS NOT NULL AND NEW.receipt_amount > 0) OR (NEW.receipt IS NOT NULL AND NEW.receipt > 0) THEN
          v_receipt := COALESCE(NEW.receipt, NEW.receipt_amount, NEW.amount, 0.00);
          v_payment := 0.00;
        ELSE
          v_payment := COALESCE(NEW.payment, NEW.payment_amount, NEW.amount, 0.00);
          v_receipt := 0.00;
        END IF;

        -- Idempotent upsert: if record with voucher_no and date exists, enrich it instead of creating duplicates
        IF COALESCE(NEW.vr_no, NEW.voucher_no, '') NOT IN ('', '--', '-') THEN
          SELECT id INTO v_existing_id FROM cash_book
          WHERE voucher_no = COALESCE(NEW.vr_no, NEW.voucher_no)
            AND date = COALESCE(NEW.date, CURRENT_DATE)
            AND (
              ABS(COALESCE(receipt, 0) + COALESCE(payment, 0) - (v_receipt + v_payment)) < 0.01
              OR category = v_category
              OR subtype = v_subtype
              OR particulars = v_particulars
            )
          ORDER BY id ASC
          LIMIT 1;

          IF v_existing_id IS NOT NULL THEN
            UPDATE cash_book SET
              type = COALESCE(NULLIF(v_type, ''), type),
              subtype = COALESCE(NULLIF(v_subtype, ''), subtype),
              sub_month = COALESCE(NULLIF(v_sub_month, ''), sub_month),
              entry_type = COALESCE(NULLIF(v_entry_type, ''), entry_type),
              bank_account = COALESCE(NULLIF(v_bank_account, ''), bank_account),
              bank_subtype = COALESCE(NULLIF(v_bank_subtype, ''), bank_subtype),
              member_code = COALESCE(NULLIF(v_member_code, ''), member_code),
              address = COALESCE(NULLIF(v_address, ''), address),
              phone = COALESCE(NULLIF(v_phone, ''), phone),
              is_cheque = COALESCE(v_is_cheque, is_cheque),
              cheque_no = COALESCE(NULLIF(v_cheque_no, ''), cheque_no),
              financial_year = COALESCE(NULLIF(v_financial_year, ''), financial_year),
              updated_at = NOW()
            WHERE id = v_existing_id;

            NEW.id := v_existing_id;
            RETURN NEW;
          END IF;
        END IF;

        INSERT INTO cash_book (
          date, voucher_no, member_id, account_name, particulars,
          receipt, payment, category_id, category, type, subtype, sub_month,
          entry_type, bank_account, bank_subtype, is_cheque, cheque_no,
          member_code, address, phone, transaction_id, financial_year,
          is_printed, is_cancelled, bank_id
        ) VALUES (
          COALESCE(NEW.date, CURRENT_DATE),
          COALESCE(NEW.vr_no, NEW.voucher_no, ''),
          v_member_id,
          v_account_name,
          v_particulars,
          v_receipt,
          v_payment,
          v_cat_id,
          v_category,
          v_type,
          v_subtype,
          v_sub_month,
          v_entry_type,
          v_bank_account,
          v_bank_subtype,
          v_is_cheque,
          v_cheque_no,
          v_member_code,
          v_address,
          v_phone,
          v_transaction_id,
          v_financial_year,
          v_is_printed,
          v_is_cancelled,
          NEW.bank_id
        ) RETURNING id INTO NEW.id;

        RETURN NEW;

      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.mode = 'Receipt' OR (NEW.receipt_amount IS NOT NULL AND NEW.receipt_amount > 0) OR (NEW.receipt IS NOT NULL AND NEW.receipt > 0) THEN
          v_receipt := COALESCE(NEW.receipt, NEW.receipt_amount, NEW.amount, 0.00);
          v_payment := 0.00;
        ELSE
          v_payment := COALESCE(NEW.payment, NEW.payment_amount, NEW.amount, 0.00);
          v_receipt := 0.00;
        END IF;

        UPDATE cash_book SET
          date = COALESCE(NEW.date, date),
          voucher_no = COALESCE(NEW.vr_no, NEW.voucher_no, voucher_no),
          account_name = COALESCE(NEW.account_name, account_name),
          particulars = COALESCE(NEW.particulars, NEW.description, particulars),
          receipt = v_receipt,
          payment = v_payment,
          category = COALESCE(NEW.category, category),
          type = COALESCE(NEW.type, type),
          subtype = COALESCE(NEW.subtype, NEW.sub_type, subtype),
          sub_month = COALESCE(NEW.sub_month, sub_month),
          entry_type = COALESCE(NEW.entry_type, entry_type),
          bank_account = COALESCE(NEW.bank_account, bank_account),
          bank_subtype = COALESCE(NEW.bank_subtype, bank_subtype),
          is_cheque = COALESCE(NEW.is_cheque, is_cheque),
          cheque_no = COALESCE(NEW.cheque_no, cheque_no),
          member_code = COALESCE(NEW.member_code, member_code),
          address = COALESCE(NEW.address, address),
          phone = COALESCE(NEW.phone, phone),
          transaction_id = COALESCE(NEW.transaction_id, transaction_id),
          financial_year = COALESCE(NEW.financial_year, financial_year),
          is_printed = COALESCE(NEW.is_printed, is_printed),
          is_cancelled = COALESCE(NEW.is_cancelled, is_cancelled),
          bank_id = COALESCE(NEW.bank_id, bank_id),
          updated_at = NOW()
        WHERE id = OLD.id;

        RETURN NEW;

      ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM cash_book WHERE id = OLD.id;
        RETURN OLD;
      END IF;

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await query(`DROP TRIGGER IF EXISTS trg_transactions_view ON transactions`);
  await query(`
    CREATE TRIGGER trg_transactions_view
    INSTEAD OF INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION trg_transactions_view_fn();
  `);

  // 2. Trigger function for bank_transactions view (targeting bank_book)
  await query(`
    CREATE OR REPLACE FUNCTION trg_bank_transactions_view_fn()
    RETURNS TRIGGER AS $$
    DECLARE
      v_member_id INT := NEW.member_id;
      v_cat_id INT;
      v_credit NUMERIC(12,2) := 0.00;
      v_debit NUMERIC(12,2) := 0.00;
      v_bank_acc VARCHAR(255) := COALESCE(NEW.bank_account, NEW.account, 'State Bank of India');
      v_particulars TEXT := COALESCE(NEW.particulars, NEW.description, '');
      v_category VARCHAR(255) := COALESCE(NEW.category, 'Bank');
      v_type VARCHAR(100) := COALESCE(NEW.type, NEW.bank_subtype, 'Bank');
      v_subtype VARCHAR(255) := COALESCE(NEW.subtype, NEW.bank_subtype, '');
      v_bank_subtype VARCHAR(255) := COALESCE(NEW.bank_subtype, NEW.subtype, '');
      v_sub_month VARCHAR(50) := COALESCE(NEW.sub_month, '');
      v_entry_type VARCHAR(50) := COALESCE(NEW.entry_type, 'Bank');
      v_account_name VARCHAR(255) := COALESCE(NEW.account_name, '');
      v_member_code VARCHAR(50) := COALESCE(NEW.member_code, '');
      v_address TEXT := COALESCE(NEW.address, '');
      v_phone VARCHAR(50) := COALESCE(NEW.phone, '');
      v_is_cheque BOOLEAN := COALESCE(NEW.is_cheque, false);
      v_cheque_no VARCHAR(100) := COALESCE(NEW.cheque_no, '');
      v_transaction_id VARCHAR(100) := COALESCE(NEW.transaction_id, '');
      v_financial_year VARCHAR(20) := COALESCE(NEW.financial_year, '2026-2027');
      v_is_printed BOOLEAN := COALESCE(NEW.is_printed, false);
      v_is_cancelled BOOLEAN := COALESCE(NEW.is_cancelled, false);
      v_existing_id INT := NULL;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF v_member_id IS NULL AND v_account_name <> '' THEN
          SELECT id INTO v_member_id FROM members 
          WHERE LOWER(name) = LOWER(v_account_name) OR LOWER(member_code) = LOWER(v_member_code)
          LIMIT 1;
        END IF;

        SELECT id INTO v_cat_id FROM categories WHERE LOWER(name) = LOWER(v_category) LIMIT 1;

        IF NEW.mode ILIKE '%Receipt%' OR NEW.mode ILIKE '%Credit%' OR NEW.mode ILIKE '%Deposit%' 
           OR v_particulars ILIKE '%cash deposit%' OR v_bank_subtype ILIKE '%cash deposit%'
           OR (NEW.receipt_amount IS NOT NULL AND NEW.receipt_amount > 0)
           OR (NEW.credit IS NOT NULL AND NEW.credit > 0)
           OR (NEW.receipt IS NOT NULL AND NEW.receipt > 0) THEN
          v_credit := COALESCE(NEW.credit, NEW.receipt, NEW.receipt_amount, NEW.amount, 0.00);
          v_debit := 0.00;
        ELSE
          v_debit := COALESCE(NEW.debit, NEW.payment, NEW.payment_amount, NEW.amount, 0.00);
          v_credit := 0.00;
        END IF;

        -- Idempotent upsert: if bank record with voucher_no or cheque_no and date exists, enrich it
        IF (COALESCE(NEW.vr_no, NEW.voucher_no, '') NOT IN ('', '--', '-')) OR (v_cheque_no <> '') THEN
          SELECT id INTO v_existing_id FROM bank_book
          WHERE (
            (COALESCE(NEW.vr_no, NEW.voucher_no, '') NOT IN ('', '--', '-') AND voucher_no = COALESCE(NEW.vr_no, NEW.voucher_no) AND date = COALESCE(NEW.date, CURRENT_DATE))
            OR
            (v_cheque_no <> '' AND cheque_no = v_cheque_no AND date = COALESCE(NEW.date, CURRENT_DATE))
          )
          AND (
            ABS(COALESCE(credit, 0) + COALESCE(debit, 0) - (v_credit + v_debit)) < 0.01
            OR bank_account = v_bank_acc
          )
          ORDER BY id ASC
          LIMIT 1;

          IF v_existing_id IS NOT NULL THEN
            UPDATE bank_book SET
              type = COALESCE(NULLIF(v_type, ''), type),
              subtype = COALESCE(NULLIF(v_subtype, ''), subtype),
              bank_subtype = COALESCE(NULLIF(v_bank_subtype, ''), bank_subtype),
              sub_month = COALESCE(NULLIF(v_sub_month, ''), sub_month),
              entry_type = COALESCE(NULLIF(v_entry_type, ''), entry_type),
              account_name = COALESCE(NULLIF(v_account_name, ''), account_name),
              member_code = COALESCE(NULLIF(v_member_code, ''), member_code),
              address = COALESCE(NULLIF(v_address, ''), address),
              phone = COALESCE(NULLIF(v_phone, ''), phone),
              is_cheque = COALESCE(v_is_cheque, is_cheque),
              cheque_no = COALESCE(NULLIF(v_cheque_no, ''), cheque_no),
              financial_year = COALESCE(NULLIF(v_financial_year, ''), financial_year),
              updated_at = NOW()
            WHERE id = v_existing_id;

            NEW.id := v_existing_id;
            RETURN NEW;
          END IF;
        END IF;

        INSERT INTO bank_book (
          date, cheque_no, voucher_no, bank_account, member_id, account_name,
          particulars, credit, debit, category_id, category, type, subtype,
          bank_subtype, sub_month, entry_type, member_code, address, phone,
          is_cheque, transaction_id, financial_year, is_printed, is_cancelled, cash_id
        ) VALUES (
          COALESCE(NEW.date, CURRENT_DATE),
          v_cheque_no,
          COALESCE(NEW.vr_no, NEW.voucher_no, ''),
          v_bank_acc,
          v_member_id,
          v_account_name,
          v_particulars,
          v_credit,
          v_debit,
          v_cat_id,
          v_category,
          v_type,
          v_subtype,
          v_bank_subtype,
          v_sub_month,
          v_entry_type,
          v_member_code,
          v_address,
          v_phone,
          v_is_cheque,
          v_transaction_id,
          v_financial_year,
          v_is_printed,
          v_is_cancelled,
          NEW.cash_id
        ) RETURNING id INTO NEW.id;

        RETURN NEW;

      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.mode ILIKE '%Receipt%' OR NEW.mode ILIKE '%Credit%' OR NEW.mode ILIKE '%Deposit%' 
           OR v_particulars ILIKE '%cash deposit%' OR v_bank_subtype ILIKE '%cash deposit%'
           OR (NEW.receipt_amount IS NOT NULL AND NEW.receipt_amount > 0)
           OR (NEW.credit IS NOT NULL AND NEW.credit > 0)
           OR (NEW.receipt IS NOT NULL AND NEW.receipt > 0) THEN
          v_credit := COALESCE(NEW.credit, NEW.receipt, NEW.receipt_amount, NEW.amount, 0.00);
          v_debit := 0.00;
        ELSE
          v_debit := COALESCE(NEW.debit, NEW.payment, NEW.payment_amount, NEW.amount, 0.00);
          v_credit := 0.00;
        END IF;

        UPDATE bank_book SET
          date = COALESCE(NEW.date, date),
          cheque_no = COALESCE(NEW.cheque_no, cheque_no),
          voucher_no = COALESCE(NEW.vr_no, NEW.voucher_no, voucher_no),
          bank_account = COALESCE(NEW.bank_account, NEW.account, bank_account),
          account_name = COALESCE(NEW.account_name, account_name),
          particulars = COALESCE(NEW.particulars, NEW.description, particulars),
          credit = v_credit,
          debit = v_debit,
          category = COALESCE(NEW.category, category),
          type = COALESCE(NEW.type, type),
          subtype = COALESCE(NEW.subtype, subtype),
          bank_subtype = COALESCE(NEW.bank_subtype, bank_subtype),
          sub_month = COALESCE(NEW.sub_month, sub_month),
          entry_type = COALESCE(NEW.entry_type, entry_type),
          member_code = COALESCE(NEW.member_code, member_code),
          address = COALESCE(NEW.address, address),
          phone = COALESCE(NEW.phone, phone),
          is_cheque = COALESCE(NEW.is_cheque, is_cheque),
          transaction_id = COALESCE(NEW.transaction_id, transaction_id),
          financial_year = COALESCE(NEW.financial_year, financial_year),
          is_printed = COALESCE(NEW.is_printed, is_printed),
          is_cancelled = COALESCE(NEW.is_cancelled, is_cancelled),
          cash_id = COALESCE(NEW.cash_id, cash_id),
          updated_at = NOW()
        WHERE id = OLD.id;

        RETURN NEW;

      ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM bank_book WHERE id = OLD.id;
        RETURN OLD;
      END IF;

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await query(`DROP TRIGGER IF EXISTS trg_bank_transactions_view ON bank_transactions`);
  await query(`
    CREATE TRIGGER trg_bank_transactions_view
    INSTEAD OF INSERT OR UPDATE OR DELETE ON bank_transactions
    FOR EACH ROW EXECUTE FUNCTION trg_bank_transactions_view_fn();
  `);

  console.log('✅ INSTEAD OF triggers created successfully on transactions and bank_transactions views.');
}

if (require.main === module) {
  setupTriggers().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
