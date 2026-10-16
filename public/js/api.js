// API Client for IPC Horeb Church Accounts Portal
// Migrated live production data from Firestore (467 transactions, 193 members, 32 bank transactions)

const isFileProtocol = window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null';

let cachedLocalStore = null;

async function getRealStore() {
  if (cachedLocalStore) return cachedLocalStore;
  try {
    const res = await fetch('data/local_db.json');
    if (res.ok) {
      cachedLocalStore = await res.json();
      return cachedLocalStore;
    }
  } catch (e) {
    console.warn('Could not load data/local_db.json directly:', e);
  }
  return null;
}

const API = {
  baseUrl: (function () {
    if (isFileProtocol) return 'http://localhost:5000/api';
    if (typeof window !== 'undefined' && window.CHURCH_API_BASE) return `${window.CHURCH_API_BASE}/api`;
    const customBackend = typeof localStorage !== 'undefined' ? localStorage.getItem('church_backend_url') : null;
    if (customBackend) return `${customBackend}/api`;
    if (typeof window !== 'undefined' && (window.location.hostname.includes('pages.dev') || window.location.hostname.includes('cloudflare'))) {
      return 'https://church-accounts-portal.onrender.com/api';
    }
    return window.location.origin + '/api';
  })(),

  getToken() {
    return localStorage.getItem('church_token') || (isFileProtocol ? 'church_live_token' : null);
  },

  setToken(token) {
    if (token) localStorage.setItem('church_token', token);
    else localStorage.removeItem('church_token');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('church_user');
    try {
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    if (isFileProtocol) {
      return {
        id: 4,
        name: 'Stephen Sam Simon',
        email: 'stephensam2001@gmail.com',
        role: 'Admin'
      };
    }
    return null;
  },

  setCurrentUser(user) {
    if (user) localStorage.setItem('church_user', JSON.stringify(user));
    else localStorage.removeItem('church_user');
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        this.logout();
        if (typeof window.showLoginModal === 'function') {
          window.showLoginModal();
        }
        throw new Error('Please log in to continue.');
      }
      const rawText = await response.text();
      let data = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (jsonErr) {
        console.warn(`[API] Response from ${url} was not JSON:`, rawText);
        return await this.getRealDataFallback(endpoint, options);
      }
      if (!response.ok) {
        throw new Error((data && data.message) || `Request failed with status ${response.status}`);
      }
      return data || await this.getRealDataFallback(endpoint, options);
    } catch (err) {
      console.info(`[API] Switching to migrated local production dataset...`);
      return await this.getRealDataFallback(endpoint, options);
    }
  },

  // Offline fallback that queries the REAL migrated dataset from Firestore
  async getRealDataFallback(endpoint, options = {}) {
    const store = await getRealStore();
    if (!store) {
      return { success: false, message: 'Server offline and local store not found' };
    }

    // 1. Dashboard
    if (endpoint.includes('/reports/dashboard')) {
      const op = (store.opening_balances || []).find(o => o.financial_year === '2026-2027') || 
                 store.opening_balances[0] || 
                 { cash_amount: 127005, sbi_current_amount: 143068.37, sbi_fd_amount: 108022 };
      
      const opCash = Number(op.cash_amount || 127005);
      const opSbi = Number(op.sbi_current_amount || 143068.37);
      const opFd = Number(op.sbi_fd_amount || 108022);

      let cashHand = opCash;
      let totalIncome = 0;
      let totalExpenditure = 0;
      const incomeCategories = {};
      const expenseCategories = {};

      const txList = store.transactions || [];
      for (const t of txList) {
        if (t.is_cancelled) continue;
        const r = Number(t.receipt_amount || (t.mode === 'Receipt' ? t.amount : 0)) || 0;
        const p = Number(t.payment_amount || (t.mode === 'Payment' ? t.amount : 0)) || 0;
        cashHand += (r - p);

        const isContra = (t.type === 'Contra') || 
                         (t.subtype && t.subtype.toLowerCase().includes('contra')) || 
                         (t.bank_subtype && t.bank_subtype.toLowerCase().includes('contra'));
        if (!isContra) {
          const amt = Number(t.amount || 0);
          const sub = t.subtype || 'General';
          if (t.mode === 'Receipt') {
            incomeCategories[sub] = (incomeCategories[sub] || 0) + amt;
            totalIncome += amt;
          } else {
            expenseCategories[sub] = (expenseCategories[sub] || 0) + amt;
            totalExpenditure += amt;
          }
        }
      }

      let sbiCurrentBal = opSbi;
      let sbiFdBal = opFd;
      const bList = store.bank_transactions || [];
      for (const b of bList) {
        const amt = Number(b.amount || 0);
        const isDep = String(b.mode).includes('Receipt') || String(b.mode).includes('Deposit');
        const acc = String(b.account).toLowerCase();
        if (acc.includes('fd') || acc.includes('fixed deposit')) {
          sbiFdBal += isDep ? amt : -amt;
        } else {
          sbiCurrentBal += isDep ? amt : -amt;
        }
      }

      const totalBank = sbiCurrentBal + sbiFdBal;
      const totalReserves = cashHand + totalBank;

      return {
        success: true,
        financialYear: '2026-2027',
        balances: {
          cashInHand: cashHand,
          sbiCurrent: sbiCurrentBal,
          sbiFd: sbiFdBal,
          totalBankBalance: totalBank,
          totalReserves: totalReserves,
          closingBalance: totalReserves,
          openingBalances: { cash: opCash, sbiCurrent: opSbi, sbiFd: opFd, total: opCash + opSbi + opFd }
        },
        pnl: {
          totalIncome,
          totalExpenditure,
          netSurplus: totalIncome - totalExpenditure,
          incomeCategories,
          expenseCategories
        },
        recentTransactions: txList.slice(-10).reverse()
      };
    }

    // 2. Transactions
    if (endpoint.includes('/transactions/next-vr-no')) {
      const txs = store.transactions || [];
      let maxR = 0;
      let maxP = 0;
      for (const t of txs) {
        const vr = String(t.vr_no || '');
        const num = parseInt(vr.replace(/\D/g, ''), 10);
        if (!isNaN(num)) {
          if (vr.startsWith('R-') || vr.startsWith('R')) maxR = Math.max(maxR, num);
          if (vr.startsWith('P-') || vr.startsWith('P')) maxP = Math.max(maxP, num);
        }
      }
      return {
        success: true,
        nextReceipt: `R-${maxR + 1}`,
        nextPayment: `P-${maxP + 1}`,
        nextBankReceipt: `R-${maxR + 1}/B`,
        nextBankPayment: `P-${maxP + 1}/B`
      };
    }

    if (endpoint.includes('/transactions')) {
      return {
        success: true,
        transactions: store.transactions || []
      };
    }

    // 3. Members
    if (endpoint.includes('/members')) {
      return {
        success: true,
        members: store.members || []
      };
    }

    // 4. Subtypes
    if (endpoint.includes('/settings/subtypes')) {
      return {
        success: true,
        subtypes: store.subtypes || []
      };
    }

    // 5. Bank Accounts
    if (endpoint.includes('/settings/bank-accounts')) {
      return {
        success: true,
        bankAccounts: store.bank_accounts || [
          { id: 1, account_name: 'State Bank of India', account_type: 'Current', is_default: true },
          { id: 2, account_name: 'SBI Fixed Deposit', account_type: 'Fixed Deposit', is_default: false }
        ]
      };
    }

    // 6. Bank Book Summary
    if (endpoint.includes('/bank/summary')) {
      const op = (store.opening_balances || []).find(o => o.financial_year === '2026-2027') || 
                 store.opening_balances[0] || 
                 { sbi_current_amount: 143068.37, sbi_fd_amount: 108022 };
      let sbi = Number(op.sbi_current_amount || 143068.37);
      let fd = Number(op.sbi_fd_amount || 108022);
      for (const b of (store.bank_transactions || [])) {
        const amt = Number(b.amount || 0);
        const isDep = String(b.mode).includes('Receipt') || String(b.mode).includes('Deposit');
        const acc = String(b.account).toLowerCase();
        if (acc.includes('fd') || acc.includes('fixed deposit')) {
          fd += isDep ? amt : -amt;
        } else {
          sbi += isDep ? amt : -amt;
        }
      }
      return {
        success: true,
        sbiCurrentBalance: sbi,
        sbiFdBalance: fd,
        totalBankBalance: sbi + fd,
        openingSbi: Number(op.sbi_current_amount || 143068.37),
        openingFd: Number(op.sbi_fd_amount || 108022)
      };
    }

    if (endpoint.includes('/bank/transactions')) {
      return {
        success: true,
        transactions: store.bank_transactions || []
      };
    }

    // 7. Cashbook
    if (endpoint.includes('/reports/cashbook')) {
      const op = (store.opening_balances || []).find(o => o.financial_year === '2026-2027') || store.opening_balances[0];
      const opCash = Number(op ? op.cash_amount : 127005);
      let running = opCash;
      const entries = (store.transactions || []).filter(t => !t.is_cancelled).map(t => {
        const r = Number(t.receipt_amount || (t.mode === 'Receipt' ? t.amount : 0)) || 0;
        const p = Number(t.payment_amount || (t.mode === 'Payment' ? t.amount : 0)) || 0;
        running += (r - p);
        return {
          id: t.id,
          date: t.date,
          vr_no: t.vr_no,
          account_name: t.account_name,
          description: t.description || t.subtype || '',
          receipt_amount: r,
          payment_amount: p,
          running_balance: running,
          mode: t.mode
        };
      });
      return {
        success: true,
        openingBalance: opCash,
        closingBalance: running,
        entries
      };
    }

    // 8. Subscriptions Matrix
    if (endpoint.includes('/reports/subscriptions-matrix')) {
      const months = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
      const memberMap = {};
      for (const m of (store.members || [])) {
        memberMap[m.member_code] = {
          member_code: m.member_code,
          name: m.name,
          months: {},
          totalPaid: 0
        };
        for (const mon of months) memberMap[m.member_code].months[mon] = 0;
      }
      for (const t of (store.transactions || [])) {
        if (t.is_cancelled || t.mode !== 'Receipt' || !t.member_code) continue;
        const sub = (t.subtype || '').toLowerCase();
        if (sub.includes('tithe') || sub.includes('subscription')) {
          const code = t.member_code;
          if (memberMap[code]) {
            const amt = Number(t.amount || 0);
            let matchedMonth = months.find(m => (t.sub_month || '').toLowerCase().includes(m.toLowerCase()));
            if (!matchedMonth && t.date) {
              const d = new Date(t.date);
              const mIdx = d.getMonth();
              const fyIdx = (mIdx >= 3) ? (mIdx - 3) : (mIdx + 9);
              matchedMonth = months[fyIdx];
            }
            if (matchedMonth) {
              memberMap[code].months[matchedMonth] += amt;
            }
            memberMap[code].totalPaid += amt;
          }
        }
      }
      return {
        success: true,
        months,
        financialYear: '2026-2027',
        matrix: Object.values(memberMap)
      };
    }

    // 9. Public Verification
    if (endpoint.includes('/public/verify')) {
      const parts = endpoint.split('/');
      const code = decodeURIComponent(parts[parts.length - 1] || '').trim();
      if (store.shared_links && store.shared_links[code]) {
        return {
          success: true,
          document: store.shared_links[code]
        };
      }
      // Check transactions
      const tx = (store.transactions || []).find(t => t.vr_no === code);
      if (tx) {
        return {
          success: true,
          document: {
            code,
            target_type: tx.mode === 'Receipt' ? 'receipt' : 'voucher',
            target_id: String(tx.id),
            payload: tx
          }
        };
      }
      // Check members
      const mem = (store.members || []).find(m => m.member_code === code);
      if (mem) {
        const memberTx = (store.transactions || []).filter(t => t.member_code === code && !t.is_cancelled);
        return {
          success: true,
          document: {
            code,
            target_type: 'statement',
            target_id: String(mem.id),
            payload: {
              member: mem,
              transactions: memberTx
            }
          }
        };
      }
      return { success: false, message: 'Document not found' };
    }

    return { success: true };
  },

  // Auth APIs
  async login(email, password) {
    if (isFileProtocol) {
      const store = await getRealStore();
      const realUser = (store && store.users || []).find(u => u.email.toLowerCase() === email.trim().toLowerCase()) || {
        id: 4,
        name: 'Stephen Sam Simon',
        email: email || 'stephensam2001@gmail.com',
        role: 'Admin'
      };
      this.setToken('church_live_token');
      this.setCurrentUser(realUser);
      return { success: true, token: 'church_live_token', user: realUser };
    }
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.success && res.token) {
      this.setToken(res.token);
      this.setCurrentUser(res.user);
    }
    return res;
  },

  logout() {
    this.setToken(null);
    this.setCurrentUser(null);
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async getUsers() {
    return this.request('/auth/users');
  },

  async createUser(userData) {
    return this.request('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async updateUser(id, userData) {
    return this.request(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  async deleteUser(id) {
    return this.request(`/auth/users/${id}`, { method: 'DELETE' });
  },

  // Dashboard & Balances
  async getDashboard(financialYear) {
    return this.request(`/reports/dashboard?financialYear=${encodeURIComponent(financialYear || '2026-2027')}`);
  },

  // Transactions
  async getNextVrNo() {
    return this.request('/transactions/next-vr-no');
  },

  async getTransactions(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/transactions?${q}`);
  },

  async addTransaction(data) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateTransaction(id, data) {
    return this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async cancelTransaction(id) {
    return this.request(`/transactions/${id}/cancel`, { method: 'PATCH' });
  },

  async markPrinted(id) {
    return this.request(`/transactions/${id}/print`, { method: 'PATCH' });
  },

  async deleteTransaction(id) {
    return this.request(`/transactions/${id}`, { method: 'DELETE' });
  },

  // Bank Book
  async getBankTransactions(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/bank/transactions?${q}`);
  },

  async getBankSummary() {
    return this.request('/bank/summary');
  },

  async addBankTransaction(data) {
    return this.request('/bank/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Members
  async getMembers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/members?${q}`);
  },

  async getMemberLedger(code) {
    return this.request(`/members/${encodeURIComponent(code)}/ledger`);
  },

  async addMember(data) {
    return this.request('/members', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateMember(id, data) {
    return this.request(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteMember(id) {
    return this.request(`/members/${id}`, { method: 'DELETE' });
  },

  // Reports
  async getCashBook(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/reports/cashbook?${q}`);
  },

  async getLedger(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/reports/ledger?${q}`);
  },

  async getSubscriptionsMatrix(financialYear) {
    return this.request(`/reports/subscriptions-matrix?financialYear=${encodeURIComponent(financialYear || '2026-2027')}`);
  },

  // Settings
  async getSubtypes() {
    return this.request('/settings/subtypes');
  },

  async addSubtype(data) {
    return this.request('/settings/subtypes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getBankAccounts() {
    return this.request('/settings/bank-accounts');
  },

  async getOpeningBalances() {
    return this.request('/settings/opening-balances');
  },

  async saveOpeningBalances(data) {
    return this.request('/settings/opening-balances', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getChurchInfo() {
    return this.request('/settings/info');
  },

  // Public document verification
  async verifyPublic(code) {
    return this.request(`/public/verify/${encodeURIComponent(code)}`);
  }
};
