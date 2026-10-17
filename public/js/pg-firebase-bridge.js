// PostgreSQL Firestore-Compatible Bridge for IPC Horeb Church Accounts Portal
// Seamlessly replaces Firebase Cloud with local PostgreSQL Express API

(function () {
  console.log('[PG Bridge] Initializing PostgreSQL Firestore Bridge...');

  // Configure Backend URL:
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
  const isRenderBackend = window.location.hostname.includes('onrender.com');
  const customBackend = window.CHURCH_BACKEND_URL || localStorage.getItem('church_backend_url');
  const defaultRenderBackend = 'https://church-accounts-portal.onrender.com';
  
  // If running directly on Render or locally, use relative path (''); otherwise route all requests to Render backend
  const API_BASE = customBackend || ((isLocalhost || isRenderBackend) ? '' : defaultRenderBackend);
  window.CHURCH_API_BASE = API_BASE;
  console.log('[PG Bridge] Backend API Base:', API_BASE || '(relative /api)');

  function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : (API_BASE ? `${API_BASE}${endpoint}` : endpoint);
    const token = localStorage.getItem('church_token');
    const headers = { ...(options.headers || {}) };
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }
  window.apiFetch = apiFetch;

  // Cache of sync data
  const store = {
    transactions: [],
    members: [],
    bank_transactions: [],
    opening_balances: {},
    users: [],
    suspense_transactions: [],
    settings: {
      subtypes: {
        "Ledger": [
          "General Expenses", "Printing and Stationery", "Electricity Expenses Church", "Electricity Expenses Parcenage",
          "Lords Supper Sunday School Expenses", "Salary Pr. T.T.Simon", "Allowance Pr. T.T.Simon", "Church Maintenance",
          "General Body Anniversary Meeting Expenses", "Fasting wednesday Prayer Expenses", "Drinking Water",
          "Church Cleaning Expenses", "Conveyance Expenses", "Suspenses", "Guest Visiting Pastors", "Generator Expenses",
          "Church Building Land Taxes", "IPC Church Registration Membership", "Kerala Water Authority for water Supply"
        ],
        "Charity": ["Charity Paid", "Charity Received"],
        "Other Income": ["Donations", "First fruits", "Anniversary Contributions Received", "Sodari Samajam"],
        "Monthly Meeting": ["Monthly Meeting Collection", "Monthly Meeting Expenses", "General Body / Committee Meeting", "Fasting Prayer Meeting"]
      },
      bank_accounts: {
        accounts: [
          { id: 1, accountName: "State Bank of India", accountType: "Current", isDefault: true, _docId: "1" },
          { id: 2, accountName: "SBI Fixed Deposit", accountType: "Fixed Deposit", isDefault: false, _docId: "2" }
        ]
      },
      subscriptions_sheet: { data: [] },
      churchUpiId: { id: "ipchoreb@sbi" },
      phoneConfig: { enabled: true, prefix: "+91" },
      field_rules: {},
      sidebarOrder: null,
      tabNames: null,
      auto_backup: { enabled: false }
    }
  };

  // Active listeners for collection / doc changes
  const collectionListeners = new Map();
  const docListeners = new Map();
  let isInitialLoaded = false;
  let initialLoadPromise = null;

  // Create doc snapshot wrapper
  function makeDocSnapshot(id, data) {
    const exists = data !== null && data !== undefined;
    return {
      id: String(id),
      exists: exists,
      data: function () {
        return data ? JSON.parse(JSON.stringify(data)) : null;
      }
    };
  }

  // Create collection snapshot wrapper
  function makeCollectionSnapshot(items) {
    let arr = items;
    if (arr && !Array.isArray(arr) && typeof arr === 'object') {
      arr = Object.keys(arr).map(k => ({
        id: k,
        _docId: k,
        financial_year: k,
        financialYear: k,
        ...(arr[k] || {})
      }));
    } else if (!Array.isArray(arr)) {
      arr = [];
    }
    const docs = arr.map(item => {
      const id = item.id || item._docId || item.financial_year || item.financialYear || String(Math.random());
      return makeDocSnapshot(id, item);
    });
    return {
      docs: docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: function (callback) {
        docs.forEach(callback);
      }
    };
  }

  // Fetch all initial data from PostgreSQL
  async function loadAllFromPostgres() {
    if (initialLoadPromise) return initialLoadPromise;

    initialLoadPromise = (async () => {
      try {
        const token = localStorage.getItem('church_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await apiFetch('/api/sync/all', { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          if (data.transactions) store.transactions = data.transactions;
          if (data.members) store.members = data.members;
          if (data.bank_transactions) store.bank_transactions = data.bank_transactions;
          if (data.opening_balances) store.opening_balances = data.opening_balances;
          if (data.users) store.users = data.users;
          if (data.settings) store.settings = { ...store.settings, ...data.settings };
          if (data.suspense_transactions) store.suspense_transactions = data.suspense_transactions;
          isInitialLoaded = true;
          console.log(`[PG Bridge] Loaded ${store.transactions.length} txs, ${store.members.length} members from PostgreSQL.`);
        }
      } catch (err) {
        console.warn('[PG Bridge] Sync fetch fallback:', err.message);
      }
    })();

    return initialLoadPromise;
  }

  // Notify listeners for a collection
  function notifyCollection(colName) {
    const listeners = collectionListeners.get(colName) || [];
    const items = store[colName] || [];
    const snap = makeCollectionSnapshot(items);
    listeners.forEach(cb => {
      try { cb(snap); } catch (e) { console.error(`Error in listener for ${colName}:`, e); }
    });
  }

  // Notify listeners for a document
  function notifyDoc(colName, docId) {
    const key = `${colName}/${docId}`;
    const listeners = docListeners.get(key) || [];
    let docData = null;
    if (colName === 'settings') {
      docData = store.settings[docId] || null;
    } else if (colName === 'opening_balances') {
      docData = store.opening_balances[docId] || null;
    } else if (store[colName]) {
      docData = store[colName].find(x => String(x.id) === String(docId) || String(x._docId) === String(docId)) || null;
    }
    const snap = makeDocSnapshot(docId, docData);
    listeners.forEach(cb => {
      try { cb(snap); } catch (e) { console.error(`Error in doc listener for ${key}:`, e); }
    });
  }

  // Document Reference class
  class DocReference {
    constructor(colName, docId) {
      this.colName = colName;
      this.id = String(docId);
    }

    async get() {
      await loadAllFromPostgres();
      let docData = null;
      if (this.colName === 'settings') {
        docData = store.settings[this.id] || null;
      } else if (this.colName === 'opening_balances') {
        docData = store.opening_balances[this.id] || null;
      } else if (store[this.colName]) {
        docData = store[this.colName].find(x => String(x.id) === this.id || String(x._docId) === this.id) || null;
      }
      return makeDocSnapshot(this.id, docData);
    }

    onSnapshot(callback) {
      const key = `${this.colName}/${this.id}`;
      if (!docListeners.has(key)) docListeners.set(key, []);
      docListeners.get(key).push(callback);

      // Trigger initial snapshot
      loadAllFromPostgres().then(() => {
        let docData = null;
        if (this.colName === 'settings') {
          docData = store.settings[this.id] || null;
        } else if (this.colName === 'opening_balances') {
          docData = store.opening_balances[this.id] || null;
        } else if (store[this.colName]) {
          docData = store[this.colName].find(x => String(x.id) === this.id || String(x._docId) === this.id) || null;
        }
        callback(makeDocSnapshot(this.id, docData));
      });

      return () => {
        const list = docListeners.get(key) || [];
        docListeners.set(key, list.filter(cb => cb !== callback));
      };
    }

    async set(data, options = {}) {
      if (this.colName === 'settings') {
        store.settings[this.id] = data;
        try {
          await apiFetch(`/api/sync/settings/${this.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } catch (e) {}
        notifyDoc('settings', this.id);
      } else if (this.colName === 'opening_balances') {
        store.opening_balances[this.id] = data;
        try {
          await apiFetch(`/api/settings/opening-balances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ financial_year: this.id, ...data })
          });
        } catch (e) {}
        notifyDoc('opening_balances', this.id);
        notifyCollection('opening_balances');
      } else {
        if (!store[this.colName]) store[this.colName] = [];
        const idx = store[this.colName].findIndex(x => String(x.id) === this.id || String(x._docId) === this.id);
        let item = { ...data, id: this.id, _docId: this.id };
        if (idx !== -1) {
          store[this.colName][idx] = { ...store[this.colName][idx], ...item };
        } else {
          store[this.colName].push(item);
        }
        try {
          const res = await apiFetch(`/api/sync/${this.colName}/${this.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || `Server returned ${res.status}`);
          }
          const resJson = await res.json().catch(() => null);
          if (resJson && resJson.success && resJson.data) {
            item = { ...item, ...resJson.data, _docId: String(resJson.data.id || resJson.id || this.id) };
            const curIdx = store[this.colName].findIndex(x => String(x.id) === this.id || String(x._docId) === this.id || (resJson.data.id && String(x.id) === String(resJson.data.id)));
            if (curIdx !== -1) {
              store[this.colName][curIdx] = item;
            }
          }
        } catch (e) {
          console.error(`[PG Bridge] Sync error for ${this.colName}:`, e);
          throw e;
        }
        notifyDoc(this.colName, this.id);
        notifyCollection(this.colName);
      }
      return true;
    }

    async update(data) {
      if (store[this.colName]) {
        const idx = store[this.colName].findIndex(x => String(x.id) === this.id || String(x._docId) === this.id);
        if (idx !== -1) {
          store[this.colName][idx] = { ...store[this.colName][idx], ...data };
        }
      }
      try {
        const res = await apiFetch(`/api/sync/${this.colName}/${this.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `Server returned ${res.status}`);
        }
        const resJson = await res.json().catch(() => null);
        if (resJson && resJson.success && resJson.data) {
          const updated = resJson.data;
          const curIdx = store[this.colName].findIndex(x => String(x.id) === this.id || String(x._docId) === this.id);
          if (curIdx !== -1) {
            store[this.colName][curIdx] = { ...store[this.colName][curIdx], ...updated };
          }
        }
      } catch (e) {
        console.error(`[PG Bridge] Update error for ${this.colName}:`, e);
        throw e;
      }
      notifyDoc(this.colName, this.id);
      notifyCollection(this.colName);
      return true;
    }

    async delete() {
      if (store[this.colName]) {
        store[this.colName] = store[this.colName].filter(x => String(x.id) !== this.id && String(x._docId) !== this.id);
      }
      try {
        await apiFetch(`/api/sync/${this.colName}/${this.id}`, {
          method: 'DELETE'
        });
      } catch (e) {}
      notifyDoc(this.colName, this.id);
      notifyCollection(this.colName);
      return true;
    }
  }

  // Query / Collection Reference class
  class QueryReference {
    constructor(colName, filters = [], limitCount = null) {
      this.colName = colName;
      this.filters = filters;
      this.limitCount = limitCount;
    }

    doc(docId) {
      return new DocReference(this.colName, docId);
    }

    where(field, op, val) {
      const nextFilters = [...this.filters, { field, op, val }];
      return new QueryReference(this.colName, nextFilters, this.limitCount);
    }

    limit(num) {
      return new QueryReference(this.colName, this.filters, num);
    }

    async get() {
      await loadAllFromPostgres();
      let items = store[this.colName] || [];
      if (this.colName === 'opening_balances') {
        const raw = store.opening_balances || {};
        items = Array.isArray(raw) ? raw : Object.keys(raw).map(fy => ({
          financial_year: fy,
          financialYear: fy,
          id: fy,
          _docId: fy,
          ...raw[fy]
        }));
      }

      // Apply where filters
      for (const f of this.filters) {
        if (f.op === '==' || f.op === '===') {
          items = items.filter(x => {
            const v1 = x[f.field];
            const v2 = f.val;
            if (v1 === v2) return true;
            if (String(v1).toLowerCase() === String(v2).toLowerCase()) return true;
            return false;
          });
        }
      }

      if (this.limitCount && this.limitCount > 0) {
        items = items.slice(0, this.limitCount);
      }

      return makeCollectionSnapshot(items);
    }

    onSnapshot(callback) {
      if (!collectionListeners.has(this.colName)) {
        collectionListeners.set(this.colName, []);
      }
      collectionListeners.get(this.colName).push(callback);

      // Trigger initial
      loadAllFromPostgres().then(() => {
        let items = store[this.colName] || [];
        if (this.colName === 'opening_balances') {
          const raw = store.opening_balances || {};
          items = Array.isArray(raw) ? raw : Object.keys(raw).map(fy => ({
            financial_year: fy,
            financialYear: fy,
            id: fy,
            _docId: fy,
            ...raw[fy]
          }));
        }
        callback(makeCollectionSnapshot(items));
      });

      return () => {
        const list = collectionListeners.get(this.colName) || [];
        collectionListeners.set(this.colName, list.filter(cb => cb !== callback));
      };
    }

    async add(data) {
      let savedData = { ...data };
      try {
        const res = await apiFetch(`/api/sync/${this.colName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `Server returned ${res.status}`);
        }
        const resJson = await res.json();
        if (resJson.data) savedData = resJson.data;
        else if (resJson.id) savedData.id = resJson.id;

        // If a linked counterpart was created/updated (e.g. Contra), refresh the counterpart collection
        if (this.colName === 'transactions' && savedData.bankId) {
          apiFetch('/api/sync/all', { headers: { 'Authorization': `Bearer ${localStorage.getItem('church_token') || ''}` } })
            .then(r => r.json())
            .then(d => {
              if (d.success && d.bank_transactions) {
                store.bank_transactions = d.bank_transactions;
                notifyCollection('bank_transactions');
              }
            }).catch(() => {});
        } else if (this.colName === 'bank_transactions' && savedData.cashId) {
          apiFetch('/api/sync/all', { headers: { 'Authorization': `Bearer ${localStorage.getItem('church_token') || ''}` } })
            .then(r => r.json())
            .then(d => {
              if (d.success && d.transactions) {
                store.transactions = d.transactions;
                notifyCollection('transactions');
              }
            }).catch(() => {});
        }
      } catch (e) {
        console.error(`[PG Bridge] Add error for ${this.colName}:`, e);
        throw e;
      }

      if (!savedData.id) savedData.id = Date.now();
      savedData._docId = String(savedData.id);

      if (!store[this.colName]) store[this.colName] = [];
      store[this.colName].push(savedData);

      notifyCollection(this.colName);
      return new DocReference(this.colName, savedData.id);
    }
  }

  // Auth mock
  const authListeners = [];
  const mockAuth = {
    get currentUser() {
      try {
        const stored = localStorage.getItem('church_auth');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      return {
        uid: '4',
        name: 'Stephen Sam Simon',
        email: 'stephensam2001@gmail.com',
        role: 'Admin',
        photoUrl: ''
      };
    },

    onAuthStateChanged(callback) {
      authListeners.push(callback);
      const user = this.currentUser;
      setTimeout(() => callback(user), 10);
      return () => {
        const idx = authListeners.indexOf(callback);
        if (idx !== -1) authListeners.splice(idx, 1);
      };
    },

    async signInWithEmailAndPassword(email, password) {
      console.log(`[PG Auth] Signing in with: ${email}`);
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Invalid credentials');
      }

      const data = await res.json();
      const user = {
        uid: String(data.user.id),
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        photoUrl: data.user.photo_url || ''
      };

      localStorage.setItem('church_token', data.token);
      localStorage.setItem('church_auth', JSON.stringify(user));

      authListeners.forEach(cb => cb(user));
      return { user };
    },

    async signOut() {
      localStorage.removeItem('church_token');
      localStorage.removeItem('church_auth');
      authListeners.forEach(cb => cb(null));
      return true;
    }
  };

  // Ensure default Stephen Sam Simon session is set if not already set
  if (!localStorage.getItem('church_auth')) {
    localStorage.setItem('church_auth', JSON.stringify({
      uid: '4',
      name: 'Stephen Sam Simon',
      email: 'stephensam2001@gmail.com',
      role: 'Admin',
      photoUrl: ''
    }));
  }

  // Firestore mock
  const mockFirestore = function () {
    return {
      collection: function (name) {
        return new QueryReference(name);
      }
    };
  };

  mockFirestore.FieldValue = {
    serverTimestamp: () => new Date().toISOString()
  };
  mockFirestore.Timestamp = {
    now: () => ({ toMillis: () => Date.now(), toDate: () => new Date() })
  };

  // Register global firebase object
  window.firebase = {
    initializeApp: function () {
      return {};
    },
    auth: function () {
      return mockAuth;
    },
    firestore: mockFirestore
  };

  // Dark Theme Management
  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('church_theme', next);
    const icon = next === 'dark' ? '☀️' : '🌙';
    const headerBtn = document.getElementById('headerThemeToggleBtn');
    const sidebarBtn = document.getElementById('sidebarThemeToggleBtn');
    if (headerBtn) headerBtn.innerText = icon;
    if (sidebarBtn) sidebarBtn.innerText = icon;
    console.log(`[PG Bridge] Theme set to: ${next}`);
  };

  // Restore saved theme on page load
  try {
    const savedTheme = localStorage.getItem('church_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    window.addEventListener('DOMContentLoaded', () => {
      const icon = savedTheme === 'dark' ? '☀️' : '🌙';
      const headerBtn = document.getElementById('headerThemeToggleBtn');
      const sidebarBtn = document.getElementById('sidebarThemeToggleBtn');
      if (headerBtn) headerBtn.innerText = icon;
      if (sidebarBtn) sidebarBtn.innerText = icon;
    });
  } catch (e) {}

  // Trigger pre-flight fetch immediately
  loadAllFromPostgres();

  console.log('[PG Bridge] PostgreSQL Firestore Bridge ready.');
})();

