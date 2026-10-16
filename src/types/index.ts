export type UserRole = 'Admin' | 'Treasurer' | 'Secretary' | 'President' | 'Committee Member';

export interface User {
  id?: number;
  name: string;
  email: string;
  password_hash?: string;
  password?: string;
  role: UserRole;
  photo_url?: string;
  is_active?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface Member {
  id?: number;
  member_code: string;
  name: string;
  phone?: string;
  address?: string;
  family_head?: string;
  photo_url?: string;
  status?: 'Active' | 'Inactive';
  monthly_pledge?: number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface BankAccount {
  id?: number;
  account_name: string;
  account_type: 'Current' | 'Fixed Deposit' | 'Savings';
  account_number?: string;
  bank_name?: string;
  branch?: string;
  ifsc_code?: string;
  is_default?: boolean;
  created_at?: Date | string;
}

export interface Subtype {
  id?: number;
  category: 'Income' | 'Expense' | 'Contra' | 'Bank';
  name: string;
  code?: string;
  is_active?: boolean;
  sort_order?: number;
  created_at?: Date | string;
}

export interface OpeningBalance {
  id?: number;
  financial_year: string;
  start_date: string;
  end_date: string;
  cash_amount: number;
  sbi_current_amount: number;
  sbi_fd_amount: number;
  notes?: string;
  created_at?: Date | string;
}

export interface Transaction {
  id?: number;
  vr_no: string;
  date: string;
  mode: 'Receipt' | 'Payment';
  entry_type: 'Cash' | 'Bank' | 'Split';
  account_name?: string;
  address?: string;
  member_id?: number | null;
  member_code?: string;
  type?: string;
  subtype?: string;
  sub_month?: string;
  bank_account?: string;
  bank_subtype?: string;
  amount: number;
  receipt_amount?: number;
  payment_amount?: number;
  description?: string;
  is_cheque?: boolean;
  cheque_no?: string;
  is_printed?: boolean;
  is_cancelled?: boolean;
  split_group_id?: string | null;
  created_by?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface BankTransaction {
  id?: number;
  tx_id?: number | null;
  vr_no?: string;
  date: string;
  mode: string; // 'Deposit (Receipt)', 'Withdrawal (Payment)', 'Interest', 'Transfer'
  account: string; // 'State Bank of India', 'SBI Fixed Deposit'
  amount: number;
  description?: string;
  subtype?: string;
  cheque_no?: string;
  transaction_id?: string;
  balance_after?: number;
  created_at?: Date | string;
}

export interface SuspenseTransaction {
  id?: number;
  date: string;
  vr_no?: string;
  description: string;
  amount: number;
  mode?: 'Receipt' | 'Payment';
  member_code?: string;
  status: 'Pending' | 'Resolved';
  resolved_tx_id?: number | null;
  notes?: string;
  created_at?: Date | string;
}

export interface Subscription {
  id?: number;
  member_id?: number;
  member_code: string;
  financial_year: string;
  month: string;
  amount_paid: number;
  due_amount: number;
  paid_date?: string | null;
  vr_no?: string;
  status: 'Paid' | 'Partial' | 'Pending';
  created_at?: Date | string;
}

export interface DashboardBalanceReport {
  financialYear: string;
  cashHand: number;
  sbiCurrent: number;
  sbiFd: number;
  totalBankBalance: number;
  totalReserves: number;
  totalIncome: number;
  totalExpenditure: number;
  netSurplus: number;
  earliestOpening: {
    cash: number;
    sbi: number;
    fd: number;
  };
}
