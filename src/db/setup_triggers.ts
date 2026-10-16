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
      v_category VARCHAR(255) := COALESCE(NEW.category, NEW.type, NEW.subtype, 'General');
      v_sub_month VARCHAR(50) := COALESCE(NEW.sub_month, '');
    BEGIN
      IF TG_OP = 'INSERT' THEN
        -- Resolve member_id if missing
        IF v_member_id IS NULL AND v_account_name <> '' THEN
          SELECT id INTO v_member_id FROM members 
          WHERE LOWER(name) = LOWER(v_account_name) OR LOWER(member_code) = LOWER(COALESCE(NEW.member_code, ''))
          LIMIT 1;
        END IF;

        -- Resolve category_id
        SELECT id INTO v_cat_id FROM categories WHERE LOWER(name) = LOWER(v_category) LIMIT 1;

        -- Calculate receipt / payment amounts
        IF NEW.mode = 'Receipt' OR (NEW.receipt_amount IS NOT NULL AND NEW.receipt_amount > 0) THEN
          v_receipt := COALESCE(NEW.receipt_amount, NEW.amount, 0.00);
          v_payment := 0.00;
        ELSE
          v_payment := COALESCE(NEW.payment_amount, NEW.amount, 0.00);
          v_receipt := 0.00;
        END IF;

        INSERT INTO cash_book (
          date, voucher_no, member_id, account_name, particulars,
          receipt, payment, category_id, category, sub_month, bank_id
        ) VALUES (
          COALESCE(NEW.date, CURRENT_DATE),
          COALESCE(NEW.vr_no, ''),
          v_member_id,
          v_account_name,
          v_particulars,
          v_receipt,
          v_payment,
          v_cat_id,
          v_category,
          v_sub_month,
          NEW.bank_id
        ) RETURNING id INTO NEW.id;

        RETURN NEW;

      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.mode = 'Receipt' OR (NEW.receipt_amount IS NOT NULL AND NEW.receipt_amount > 0) THEN
          v_receipt := COALESCE(NEW.receipt_amount, NEW.amount, 0.00);
          v_payment := 0.00;
        ELSE
          v_payment := COALESCE(NEW.payment_amount, NEW.amount, 0.00);
          v_receipt := 0.00;
        END IF;

        UPDATE cash_book SET
          date = COALESCE(NEW.date, date),
          voucher_no = COALESCE(NEW.vr_no, voucher_no),
          account_name = COALESCE(NEW.account_name, account_name),
          particulars = COALESCE(NEW.particulars, NEW.description, particulars),
          receipt = v_receipt,
          payment = v_payment,
          category = COALESCE(NEW.category, NEW.type, NEW.subtype, category),
          sub_month = COALESCE(NEW.sub_month, sub_month),
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
      v_category VARCHAR(255) := COALESCE(NEW.bank_subtype, NEW.type, 'Bank');
      v_sub_month VARCHAR(50) := COALESCE(NEW.sub_month, '');
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF v_member_id IS NULL AND COALESCE(NEW.account_name, '') <> '' THEN
          SELECT id INTO v_member_id FROM members 
          WHERE LOWER(name) = LOWER(NEW.account_name) OR LOWER(member_code) = LOWER(COALESCE(NEW.member_code, ''))
          LIMIT 1;
        END IF;

        SELECT id INTO v_cat_id FROM categories WHERE LOWER(name) = LOWER(v_category) LIMIT 1;

        IF NEW.mode ILIKE '%Receipt%' OR NEW.mode ILIKE '%Credit%' OR NEW.mode ILIKE '%Deposit%' 
           OR v_particulars ILIKE '%cash deposit%' OR v_category ILIKE '%cash deposit%'
           OR (NEW.receipt_amount IS NOT NULL AND NEW.receipt_amount > 0) OR (NEW.credit IS NOT NULL AND NEW.credit > 0) THEN
          v_credit := COALESCE(NEW.receipt_amount, NEW.credit, NEW.amount, 0.00);
          v_debit := 0.00;
        ELSE
          v_debit := COALESCE(NEW.payment_amount, NEW.debit, NEW.amount, 0.00);
          v_credit := 0.00;
        END IF;

        INSERT INTO bank_book (
          date, cheque_no, voucher_no, bank_account, member_id,
          particulars, credit, debit, category_id, category, sub_month, cash_id
        ) VALUES (
          COALESCE(NEW.date, CURRENT_DATE),
          COALESCE(NEW.cheque_no, ''),
          COALESCE(NEW.vr_no, ''),
          v_bank_acc,
          v_member_id,
          v_particulars,
          v_credit,
          v_debit,
          v_cat_id,
          v_category,
          v_sub_month,
          NEW.cash_id
        ) RETURNING id INTO NEW.id;

        RETURN NEW;

      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.mode ILIKE '%Receipt%' OR NEW.mode ILIKE '%Credit%' OR NEW.mode ILIKE '%Deposit%' 
           OR v_particulars ILIKE '%cash deposit%' OR v_category ILIKE '%cash deposit%'
           OR (NEW.receipt_amount IS NOT NULL AND NEW.receipt_amount > 0) OR (NEW.credit IS NOT NULL AND NEW.credit > 0) THEN
          v_credit := COALESCE(NEW.receipt_amount, NEW.credit, NEW.amount, 0.00);
          v_debit := 0.00;
        ELSE
          v_debit := COALESCE(NEW.payment_amount, NEW.debit, NEW.amount, 0.00);
          v_credit := 0.00;
        END IF;

        UPDATE bank_book SET
          date = COALESCE(NEW.date, date),
          cheque_no = COALESCE(NEW.cheque_no, cheque_no),
          voucher_no = COALESCE(NEW.vr_no, voucher_no),
          bank_account = COALESCE(NEW.bank_account, NEW.account, bank_account),
          particulars = COALESCE(NEW.particulars, NEW.description, particulars),
          credit = v_credit,
          debit = v_debit,
          category = COALESCE(NEW.bank_subtype, NEW.type, category),
          sub_month = COALESCE(NEW.sub_month, sub_month),
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
