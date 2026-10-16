// IPC Horeb Church Accounts Management System - Complete Client Application Logic
// Matches reference_repo UI/UX, responsive layouts, 15 tabs, entry screen, dark theme & PostgreSQL backend

let currentFY = '2026-2027';
let currentTab = 'statementTab';
let cachedSubtypes = [];
let cachedMembers = [];
let cachedBankAccounts = [];
let cachedTransactions = [];
let cachedBankTransactions = [];
let currentUser = null;

let currentMode = 'Receipt';
let currentEntryType = 'Cash';

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  currentUser = API.getCurrentUser();
  if (!currentUser) {
    showLoginModal();
  } else {
    updateUserBadge(currentUser);
    applyRBAC(currentUser.role);
    await initAppData();
  }
  setupEventListeners();
});

// Theme Management (Light / Dark)
function initTheme() {
  const saved = localStorage.getItem('church_theme') || 'light';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const target = current === 'dark' ? 'light' : 'dark';
  applyTheme(target);
  localStorage.setItem('church_theme', target);
  showToast(`Switched to ${target === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
  const icons = document.querySelectorAll('.theme-icon');
  icons.forEach(el => el.innerText = theme === 'dark' ? '☀️' : '🌙');
}

// Sidebar Mobile Drawer Toggle
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.toggle('active');
  if (backdrop) backdrop.classList.toggle('active');
}

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cssText = `
    display: flex; align-items: center; gap: 8px;
    background: ${type === 'error' ? '#ef4444' : type === 'info' ? '#3b82f6' : '#10b981'};
    color: white; padding: 12px 18px; border-radius: 8px; font-weight: 700;
    margin-top: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.2); transition: opacity 0.3s;
  `;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatCurrency(num) {
  const n = parseFloat(num) || 0;
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Login & Auth
function showLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'flex';
}
window.showLoginModal = showLoginModal;

function hideLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'none';
}
window.hideLoginModal = hideLoginModal;

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const btn = document.getElementById('btnLoginSubmit');

  btn.disabled = true;
  btn.innerText = 'Signing in...';

  try {
    const res = await API.login(email, pass);
    currentUser = res.user;
    updateUserBadge(currentUser);
    applyRBAC(currentUser.role);
    hideLoginModal();
    showToast(`Welcome back, ${currentUser.name}! 👋`);
    await initAppData();
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Sign In to Portal';
  }
}

function logout() {
  API.logout();
  currentUser = null;
  showToast('Logged out successfully');
  showLoginModal();
}

function updateUserBadge(user) {
  const nameEl = document.getElementById('sidebarUserName');
  const roleEl = document.getElementById('sidebarUserRole');
  const initialEl = document.getElementById('sidebarUserInitial');
  if (nameEl) nameEl.innerText = user.name;
  if (roleEl) roleEl.innerText = user.role;
  if (initialEl) initialEl.innerText = (user.name || 'U').charAt(0).toUpperCase();
}

function applyRBAC(role) {
  const isEditor = role === 'Admin' || role === 'Treasurer';
  const isAdmin = role === 'Admin';
  const entryNav = document.getElementById('navItemEntry');
  const editNav = document.getElementById('navItemEdit');
  const settingsNav = document.getElementById('nav_settingsTab');
  if (entryNav) entryNav.style.display = isEditor ? 'flex' : 'none';
  if (editNav) editNav.style.display = isEditor ? 'flex' : 'none';
  if (settingsNav) settingsNav.style.display = isAdmin ? 'flex' : 'none';
}

// Load Application Data
async function initAppData() {
  try {
    const [subRes, memRes, bankRes, txRes, btxRes] = await Promise.all([
      API.getSubtypes(),
      API.getMembers(),
      API.getBankAccounts(),
      API.getTransactions(),
      API.getBankTransactions()
    ]);

    cachedSubtypes = subRes.subtypes || [];
    cachedMembers = memRes.members || [];
    cachedBankAccounts = bankRes.bankAccounts || [];
    cachedTransactions = txRes.transactions || [];
    cachedBankTransactions = btxRes.transactions || [];

    populateInitialDropdowns();
    await switchTab(currentTab);
  } catch (err) {
    console.error('Error initializing app data:', err);
  }
}

function populateInitialDropdowns() {
  // Populate Bank Accounts
  const bSelect = document.getElementById('bankAccountSelect');
  if (bSelect && cachedBankAccounts.length > 0) {
    bSelect.innerHTML = cachedBankAccounts.map(b => `<option value="${b.account_name}">${b.account_name}</option>`).join('');
  }

  // Populate Members dropdown for Member Statement
  const stmtSelect = document.getElementById('stmtMemberPicker');
  const ledgerSelect = document.getElementById('memberLedgerSelect');
  const optionsHtml = '<option value="">-- Select Member --</option>' + 
    cachedMembers.map(m => {
      let t = m.title || 'Br.';
      if (!t.endsWith('.')) t = t + '.';
      const clean = (m.name || '').replace(/^(Br|Sr|Pr|Evg|Brother|Sister|Pastor|Evangelist)\.?\s+/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
      const nick = m.nickname ? ` (${m.nickname})` : '';
      return `<option value="${m.member_code}">${m.member_code} - ${t} ${clean}${nick}</option>`;
    }).join('');
  if (stmtSelect) stmtSelect.innerHTML = optionsHtml;
  if (ledgerSelect) ledgerSelect.innerHTML = optionsHtml;

  // Populate Ledger head select
  const heads = [...new Set(cachedTransactions.map(t => t.subtype || t.type).filter(Boolean))];
  const lSelect = document.getElementById('ledgerHeadSelect');
  if (lSelect) {
    lSelect.innerHTML = heads.map(h => `<option value="${h}">${h}</option>`).join('');
  }
}

// Tab Switching
async function switchTab(tabId) {
  currentTab = tabId;

  // Update Nav links
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Switch Panes
  document.querySelectorAll('.page-tab').forEach(el => el.style.display = 'none');
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';

  // Update Title
  const titles = {
    statementTab: 'Financial Dashboard & Balances',
    entryTab: 'Data Entry (New Voucher / Receipt)',
    editTab: 'Audit & Transaction Editing Screen',
    transactionsTab: 'Cash Book Ledger',
    bankBookTab: 'Bank Book Ledger',
    ledgerTab: 'General Ledger Accounts',
    membersDirectoryTab: 'Members Directory (Roll)',
    membersTab: 'Member Ledger',
    offeringTab: 'Offering Log',
    charityTab: 'Charity Statement',
    otherIncomeTab: 'Other Income Ledger',
    subscriptionsTab: '12-Month Subscriptions Matrix',
    memberStatementTab: 'Verified Member Statement',
    suspenseTab: 'Suspense Accounts',
    settingsTab: 'Settings & Administration'
  };
  const heading = document.getElementById('pageMainHeading');
  if (heading) heading.innerText = titles[tabId] || 'Accounts Portal';

  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.classList.contains('active')) toggleSidebar();

  // Load Tab Content
  switch (tabId) {
    case 'statementTab':
      await loadDashboardData();
      break;
    case 'entryTab':
      await prepareEntryForm();
      break;
    case 'editTab':
      renderEditTable(cachedTransactions);
      break;
    case 'transactionsTab':
      renderCashBookTable();
      break;
    case 'bankBookTab':
      renderBankBookTable();
      break;
    case 'ledgerTab':
      const firstHead = document.getElementById('ledgerHeadSelect')?.value;
      if (firstHead) loadLedgerForHead(firstHead);
      break;
    case 'membersDirectoryTab':
      renderMembersDirectory(cachedMembers);
      break;
    case 'membersTab':
      if (cachedMembers.length > 0) loadMemberLedger(cachedMembers[0].member_code);
      break;
    case 'offeringTab':
      renderOfferingLog();
      break;
    case 'charityTab':
      renderCharityStatement();
      break;
    case 'otherIncomeTab':
      renderOtherIncome();
      break;
    case 'subscriptionsTab':
      await renderSubscriptionsReport();
      break;
    case 'memberStatementTab':
      if (cachedMembers.length > 0) renderOfficialStatement(cachedMembers[0].member_code);
      break;
    case 'suspenseTab':
      renderSuspenseTable();
      break;
    case 'settingsTab':
      await loadSettings();
      break;
  }
}

// 1. Dashboard Tab
async function loadDashboardData() {
  try {
    const res = await API.getDashboard(currentFY);
    if (!res.success) return;

    const b = res.balances;
    const p = res.pnl;

    document.getElementById('dashTotalReserves').innerText = formatCurrency(b.totalReserves);
    document.getElementById('dashCashHand').innerText = formatCurrency(b.cashInHand);
    document.getElementById('dashSbiCurrent').innerText = formatCurrency(b.sbiCurrent);
    document.getElementById('dashSbiFd').innerText = formatCurrency(b.sbiFd);

    document.getElementById('dashOpCash').innerText = formatCurrency(b.openingBalances.cash);
    document.getElementById('dashOpSbi').innerText = formatCurrency(b.openingBalances.sbiCurrent);
    document.getElementById('dashOpFd').innerText = formatCurrency(b.openingBalances.sbiFd);

    document.getElementById('dashTotalIncomeBadge').innerText = formatCurrency(p.totalIncome);
    document.getElementById('dashTotalExpenseBadge').innerText = formatCurrency(p.totalExpenditure);
    document.getElementById('dashNetSurplus').innerText = formatCurrency(p.netSurplus);
    document.getElementById('dashClosingBalance').innerText = formatCurrency(b.closingBalance);

    // Render Income table
    const incBody = document.getElementById('dashIncomeTableBody');
    if (incBody) {
      incBody.innerHTML = Object.entries(p.incomeCategories).map(([cat, amt]) => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 10px 4px; font-weight: 600; color: var(--text-dark);">${cat}</td>
          <td style="padding: 10px 4px; text-align: right; font-weight: 700; color: #059669;">${formatCurrency(amt)}</td>
        </tr>
      `).join('') || '<tr><td colspan="2" style="padding: 12px; text-align: center; color: var(--text-muted);">No income records</td></tr>';
    }

    // Render Expense table
    const expBody = document.getElementById('dashExpenseTableBody');
    if (expBody) {
      expBody.innerHTML = Object.entries(p.expenseCategories).map(([cat, amt]) => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 10px 4px; font-weight: 600; color: var(--text-dark);">${cat}</td>
          <td style="padding: 10px 4px; text-align: right; font-weight: 700; color: #dc2626;">${formatCurrency(amt)}</td>
        </tr>
      `).join('') || '<tr><td colspan="2" style="padding: 12px; text-align: center; color: var(--text-muted);">No expense records</td></tr>';
    }

    // Update entry tab balance pill
    const entBal = document.getElementById('entryTabBalance');
    if (entBal) entBal.innerText = formatCurrency(b.cashInHand);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

// 2. Data Entry Screen Functions
function setMode(mode) {
  currentMode = mode;
  document.getElementById('txType').value = mode;

  const btnR = document.getElementById('btnReceipt');
  const btnP = document.getElementById('btnPayment');
  const vrLabel = document.getElementById('vrLabel');
  const btnSavePrint = document.querySelector('button[onclick="handleSaveAndPrint()"]');

  if (mode === 'Receipt') {
    btnR.style.background = '#047857';
    btnR.style.color = 'white';
    btnP.style.background = 'transparent';
    btnP.style.color = 'var(--text-muted)';
    if (vrLabel) vrLabel.innerText = 'Receipt No *';
    if (btnSavePrint) btnSavePrint.innerText = '🖨️ Save & Print Receipt';
  } else {
    btnP.style.background = '#b91c1c';
    btnP.style.color = 'white';
    btnR.style.background = 'transparent';
    btnR.style.color = 'var(--text-muted)';
    if (vrLabel) vrLabel.innerText = 'Payment Voucher No *';
    if (btnSavePrint) btnSavePrint.innerText = '🖨️ Save & Print Voucher';
  }
  updateNextVoucherNumber();
}

function setEntryType(type) {
  currentEntryType = type;
  document.getElementById('entryType').value = type;

  const btnC = document.getElementById('btnEntryCash');
  const btnB = document.getElementById('btnEntryBank');
  const bWrapper = document.getElementById('bankAccountWrapper');
  const bSuffix = document.getElementById('bankVrSuffix');

  if (type === 'Cash') {
    btnC.style.background = 'var(--bg-white)';
    btnC.style.color = 'var(--text-dark)';
    btnB.style.background = 'transparent';
    btnB.style.color = 'var(--text-muted)';
    if (bWrapper) bWrapper.style.display = 'none';
    if (bSuffix) bSuffix.style.display = 'none';
  } else {
    btnB.style.background = 'var(--bg-white)';
    btnB.style.color = 'var(--text-dark)';
    btnC.style.background = 'transparent';
    btnC.style.color = 'var(--text-muted)';
    if (bWrapper) bWrapper.style.display = 'flex';
    if (bSuffix) bSuffix.style.display = 'block';
  }
  updateNextVoucherNumber();
}

async function prepareEntryForm() {
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  await updateNextVoucherNumber();
}

async function updateNextVoucherNumber() {
  try {
    const res = await API.getNextVrNo();
    const vrInput = document.getElementById('vrNo');
    if (!vrInput) return;
    if (currentMode === 'Receipt') {
      vrInput.value = currentEntryType === 'Bank' ? res.nextBankReceipt : res.nextReceipt;
    } else {
      vrInput.value = currentEntryType === 'Bank' ? res.nextBankPayment : res.nextPayment;
    }
  } catch (e) {
    console.warn('Could not fetch next voucher no:', e);
  }
}

// Member Search Autocomplete
function onAccountNameFocus() {
  onAccountNameInput();
}

function onAccountNameInput() {
  const q = document.getElementById('accountName').value.trim().toLowerCase();
  const dropdown = document.getElementById('customMembersDropdown');
  if (!dropdown) return;

  const filtered = cachedMembers.filter(m => 
    m.name.toLowerCase().includes(q) || m.member_code.toLowerCase().includes(q)
  ).slice(0, 8);

  if (filtered.length === 0) {
    dropdown.style.display = 'none';
    return;
  }

  dropdown.innerHTML = filtered.map(m => `
    <div onclick="selectMemberFromDropdown('${m.member_code}')" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--text-dark);">
      <strong>${m.member_code}</strong> - ${m.name}
      <div style="font-size: 0.72rem; color: var(--text-muted);">${m.address || 'Thadiyoor'} ${m.phone ? '• ' + m.phone : ''}</div>
    </div>
  `).join('');
  dropdown.style.display = 'block';
}

function selectMemberFromDropdown(code) {
  const m = cachedMembers.find(mem => mem.member_code === code);
  const dropdown = document.getElementById('customMembersDropdown');
  if (dropdown) dropdown.style.display = 'none';
  if (!m) return;

  document.getElementById('accountName').value = `${m.name} (${m.member_code})`;
  const addrPreview = document.getElementById('addressPreview');
  const addrText = document.getElementById('addressText');
  const phoneText = document.getElementById('phoneText');

  if (addrPreview) addrPreview.style.display = 'block';
  if (addrText) addrText.innerText = m.address || 'IPC Horeb, Thadiyoor';
  if (phoneText) phoneText.innerText = m.phone || 'N/A';
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('#accountName') && !e.target.closest('#customMembersDropdown')) {
    const dropdown = document.getElementById('customMembersDropdown');
    if (dropdown) dropdown.style.display = 'none';
  }
});

function toggleChequeInput(checked) {
  const group = document.getElementById('chequeInputGroup');
  if (group) group.style.display = checked ? 'block' : 'none';
}

function onTypeChanged() {
  const cat = document.getElementById('type').value;
  const subWrap = document.getElementById('subMonthWrapper');
  if (subWrap) subWrap.style.display = cat === 'Subscription' ? 'block' : 'none';
}

function updateAmountInWords(amount) {
  const num = parseFloat(amount);
  const hint = document.getElementById('amountWordsHint');
  const text = document.getElementById('amountWordsText');
  if (!hint || !text) return;
  if (!num || isNaN(num) || num <= 0) {
    hint.style.display = 'none';
    return;
  }
  text.innerText = numberToWords(Math.round(num)) + ' Rupees Only';
  hint.style.display = 'block';
}

function numberToWords(n) {
  if (n === 0) return 'Zero';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function convert(num) {
    if (num < 20) return units[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + units[num % 10] : '');
    if (num < 1000) return units[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + convert(num % 100) : '');
    if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
    if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '');
    return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '');
  }
  return convert(n);
}

// Form Submission
async function handleFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSaveSubmit');
  btn.disabled = true;
  btn.innerText = 'Saving...';

  const date = document.getElementById('date').value;
  const vr_no = document.getElementById('vrNo').value.trim();
  const account_name = document.getElementById('accountName').value.trim();
  const type = document.getElementById('type').value;
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  const description = document.getElementById('description').value.trim();
  const is_cheque = document.getElementById('isCheque').checked;
  const cheque_no = document.getElementById('chequeNo').value.trim();
  const sub_month = type === 'Subscription' ? document.getElementById('subMonthSelect').value : '';

  // Extract member code if in name
  let member_code = '';
  const match = account_name.match(/\((H-\d+)\)/);
  if (match) member_code = match[1];

  const payload = {
    vr_no,
    date,
    mode: currentMode,
    entry_type: currentEntryType,
    account_name,
    member_code,
    type,
    subtype: type,
    sub_month,
    bank_account: currentEntryType === 'Bank' ? document.getElementById('bankAccountSelect').value : '',
    bank_subtype: currentEntryType === 'Bank' ? document.getElementById('bankSubtypeSelect').value : '',
    amount,
    receipt_amount: currentMode === 'Receipt' ? amount : 0,
    payment_amount: currentMode === 'Payment' ? amount : 0,
    description,
    is_cheque,
    cheque_no
  };

  try {
    const res = await API.addTransaction(payload);
    showToast(`Transaction ${vr_no} recorded successfully! 💾`);
    clearEntryForm();
    await initAppData();
  } catch (err) {
    showToast(err.message || 'Failed to save transaction', 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = '💾 Save Entry';
  }
}

async function handleSaveAndPrint() {
  const vr = document.getElementById('vrNo').value.trim();
  // Submit the form first
  const form = document.getElementById('cashBookForm');
  if (form.checkValidity()) {
    await handleFormSubmit(new Event('submit'));
    // Open verification print page
    window.open(`view.html?doc=${encodeURIComponent(vr)}`, '_blank');
  } else {
    form.reportValidity();
  }
}

function clearEntryForm() {
  document.getElementById('accountName').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('description').value = '';
  document.getElementById('addressPreview').style.display = 'none';
  document.getElementById('amountWordsHint').style.display = 'none';
  document.getElementById('isCheque').checked = false;
  document.getElementById('chequeInputGroup').style.display = 'none';
  updateNextVoucherNumber();
}

// UPI QR Generator
function generateUpiQr() {
  const amt = parseFloat(document.getElementById('amount').value) || 0;
  if (!amt || amt <= 0) {
    showToast('Please enter an amount to generate UPI QR', 'info');
    return;
  }
  const upiUrl = `upi://pay?pa=ipchoreb@sbi&pn=IPC%20Horeb%20Church&am=${amt}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`;

  const imgContainer = document.getElementById('upiQrImgContainer');
  const badge = document.getElementById('upiAmountBadge');
  if (imgContainer) imgContainer.innerHTML = `<img src="${qrUrl}" alt="UPI QR" style="width: 200px; height: 200px; display: block;">`;
  if (badge) badge.innerText = formatCurrency(amt);

  const modal = document.getElementById('upiQrModal');
  if (modal) modal.style.display = 'flex';
}

function closeUpiQrModal() {
  const modal = document.getElementById('upiQrModal');
  if (modal) modal.style.display = 'none';
}

// 3. Edit Screen Table
function renderEditTable(txList) {
  const tbody = document.getElementById('editTableBody');
  if (!tbody) return;
  tbody.innerHTML = txList.slice(-50).reverse().map(t => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 14px; font-weight: 700; color: var(--text-dark);">${t.vr_no}</td>
      <td style="padding: 10px 14px;">${t.date}</td>
      <td style="padding: 10px 14px; font-weight: 600;">${t.account_name}</td>
      <td style="padding: 10px 14px;"><span style="background: var(--bg-slate-100); padding: 2px 8px; border-radius: 4px; font-size: 0.78rem;">${t.subtype || t.type}</span></td>
      <td style="padding: 10px 14px; font-weight: 700; color: ${t.mode === 'Receipt' ? '#059669' : '#dc2626'};">${t.mode}</td>
      <td style="padding: 10px 14px; text-align: right; font-weight: 800;">${formatCurrency(t.amount)}</td>
      <td style="padding: 10px 14px; text-align: center;">
        <button onclick="window.open('view.html?doc=${t.vr_no}', '_blank')" style="border: none; background: #eff6ff; color: #2563eb; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 0.75rem;">🖨️ Print</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="padding: 16px; text-align: center; color: var(--text-muted);">No transactions found</td></tr>';
}

function searchTransactionsForEdit(query) {
  const q = query.trim().toLowerCase();
  const filtered = cachedTransactions.filter(t => 
    (t.vr_no && t.vr_no.toLowerCase().includes(q)) || 
    (t.account_name && t.account_name.toLowerCase().includes(q))
  );
  renderEditTable(filtered);
}

// 4. Cash Book Table
async function renderCashBookTable() {
  const tbody = document.getElementById('cashbookTableBody');
  if (!tbody) return;
  try {
    const res = await API.getCashBook({ financialYear: currentFY });
    if (!res.success) return;
    tbody.innerHTML = (res.entries || []).map(e => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 14px;">${e.date}</td>
        <td style="padding: 10px 14px; font-weight: 700; color: var(--text-dark);">${e.vr_no}</td>
        <td style="padding: 10px 14px;"><div style="font-weight: 700; color: var(--text-dark);">${e.account_name}</div>${e.address ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">📍 ${e.address}</div>` : ''} ${e.description ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1px;">• ${e.description}</div>` : ''}</td>
        <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #059669;">${e.receipt_amount ? formatCurrency(e.receipt_amount) : '-'}</td>
        <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #dc2626;">${e.payment_amount ? formatCurrency(e.payment_amount) : '-'}</td>
        <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: var(--text-dark);">${formatCurrency(e.running_balance)}</td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="padding: 16px; text-align: center; color: var(--text-muted);">No entries in Cash Book</td></tr>';
  } catch (err) {
    console.error('Failed to load cash book:', err);
  }
}

// 5. Bank Book Table
function renderBankBookTable() {
  const tbody = document.getElementById('bankbookTableBody');
  if (!tbody) return;
  tbody.innerHTML = cachedBankTransactions.map(b => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 14px;">${b.date}</td>
      <td style="padding: 10px 14px; font-weight: 700;">${b.vr_no || '-'}</td>
      <td style="padding: 10px 14px; font-weight: 600;">${b.account}</td>
      <td style="padding: 10px 14px;">${b.description || b.subtype || '-'}</td>
      <td style="padding: 10px 14px; font-weight: 700; color: ${String(b.mode).includes('Receipt') || String(b.mode).includes('Deposit') || String(b.mode).includes('Credit') ? '#059669' : '#dc2626'};">${b.mode}</td>
      <td style="padding: 10px 14px; text-align: right; font-weight: 800;">${formatCurrency(b.amount)}</td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="padding: 16px; text-align: center; color: var(--text-muted);">No bank transactions recorded</td></tr>';
}

// 6. Ledger Accounts
function loadLedgerForHead(headName) {
  const tbody = document.getElementById('ledgerTableBody');
  if (!tbody) return;
  const filtered = cachedTransactions.filter(t => (t.subtype === headName || t.type === headName) && !t.is_cancelled);
  tbody.innerHTML = filtered.map(t => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 14px;">${t.date}</td>
      <td style="padding: 10px 14px; font-weight: 700;">${t.vr_no}</td>
      <td style="padding: 10px 14px; font-weight: 600;">${t.account_name}</td>
      <td style="padding: 10px 14px;">${t.description || '-'}</td>
      <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: ${t.mode === 'Receipt' ? '#059669' : '#dc2626'};">${formatCurrency(t.amount)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">No records under this head</td></tr>';
}

// 7. Members Directory
function renderMembersDirectory(members) {
  const tbody = document.getElementById('membersDirectoryBody');
  if (!tbody) return;
  tbody.innerHTML = members.map(m => {
    let t = m.title || '';
    if (!t) t = 'Br.';
    else if (!t.endsWith('.')) t = t + '.';
    const cleanName = (m.name || '').replace(/^(Br|Sr|Pr|Evg|Brother|Sister|Pastor|Evangelist)\.?\s+/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const nickStr = m.nickname ? ` (${m.nickname})` : '';
    const displayName = `${t} ${cleanName}${nickStr}`;
    return `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 14px; font-weight: 800; color: #10b981; text-align: center;">${m.member_code}</td>
      <td style="padding: 10px 14px; font-weight: 700; color: var(--text-dark);">${displayName}</td>
      <td style="padding: 10px 14px;">${m.address || 'Thadiyoor'}</td>
      <td style="padding: 10px 14px;">${m.phone || 'N/A'}</td>
      <td style="padding: 10px 14px; text-align: center;"><span style="background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">${m.status || 'Active'}</span></td>
      <td style="padding: 10px 14px; text-align: center;">
        <button onclick="viewMemberLedger('${m.member_code}')" style="border: none; background: #e0e7ff; color: #4338ca; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 0.75rem;">Statement</button>
      </td>
    </tr>
  `}).join('') || '<tr><td colspan="6" style="padding: 16px; text-align: center; color: var(--text-muted);">No members found</td></tr>';
}

function filterMembersDirectory(query) {
  const q = query.trim().toLowerCase();
  const filtered = cachedMembers.filter(m => 
    m.name.toLowerCase().includes(q) || 
    m.member_code.toLowerCase().includes(q) || 
    (m.phone && m.phone.toLowerCase().includes(q))
  );
  renderMembersDirectory(filtered);
}

function viewMemberLedger(code) {
  switchTab('memberStatementTab');
  const sel = document.getElementById('stmtMemberPicker');
  if (sel) sel.value = code;
  renderOfficialStatement(code);
}

// 8. Individual Member Ledger
function loadMemberLedger(code) {
  const tbody = document.getElementById('individualMemberLedgerBody');
  if (!tbody) return;
  const filtered = cachedTransactions.filter(t => t.member_code === code && !t.is_cancelled);
  tbody.innerHTML = filtered.map(t => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 14px;">${t.date}</td>
      <td style="padding: 10px 14px; font-weight: 700;">${t.vr_no}</td>
      <td style="padding: 10px 14px;">${t.subtype || t.type}</td>
      <td style="padding: 10px 14px;">${t.sub_month || '-'}</td>
      <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #059669;">${formatCurrency(t.amount)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">No transactions recorded for this member</td></tr>';
}

// 9. Offering Log
function renderOfferingLog() {
  const tbody = document.getElementById('offeringLogBody');
  if (!tbody) return;
  const filtered = cachedTransactions.filter(t => 
    (t.type === 'Offering' || (t.subtype && t.subtype.toLowerCase().includes('offering'))) && !t.is_cancelled
  );
  tbody.innerHTML = filtered.map(t => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 14px;">${t.date}</td>
      <td style="padding: 10px 14px; font-weight: 700;">${t.vr_no}</td>
      <td style="padding: 10px 14px; font-weight: 600;">${t.subtype || 'Sunday Offering'}</td>
      <td style="padding: 10px 14px;">${t.description || '-'}</td>
      <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #059669;">${formatCurrency(t.amount)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">No offering entries recorded</td></tr>';
}

// 10. Charity Statement
function renderCharityStatement() {
  const tbody = document.getElementById('charityStatementBody');
  if (!tbody) return;
  const filtered = cachedTransactions.filter(t => 
    (t.type === 'Charity' || (t.subtype && t.subtype.toLowerCase().includes('charity'))) && !t.is_cancelled
  );
  tbody.innerHTML = filtered.map(t => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 14px;">${t.date}</td>
      <td style="padding: 10px 14px; font-weight: 700;">${t.vr_no}</td>
      <td style="padding: 10px 14px; font-weight: 600;">${t.account_name}</td>
      <td style="padding: 10px 14px; font-weight: 700; color: ${t.mode === 'Receipt' ? '#059669' : '#dc2626'};">${t.mode}</td>
      <td style="padding: 10px 14px; text-align: right; font-weight: 800;">${formatCurrency(t.amount)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">No charity entries recorded</td></tr>';
}

// 11. Other Income
function renderOtherIncome() {
  const tbody = document.getElementById('otherIncomeBody');
  if (!tbody) return;
  const filtered = cachedTransactions.filter(t => 
    t.mode === 'Receipt' && t.type !== 'Subscription' && t.type !== 'Offering' && !t.is_cancelled
  );
  tbody.innerHTML = filtered.map(t => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 14px;">${t.date}</td>
      <td style="padding: 10px 14px; font-weight: 700;">${t.vr_no}</td>
      <td style="padding: 10px 14px; font-weight: 600;">${t.account_name}</td>
      <td style="padding: 10px 14px;">${t.subtype || t.type}</td>
      <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #059669;">${formatCurrency(t.amount)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">No other income entries recorded</td></tr>';
}

// 12. Subscriptions 12-Month Matrix
async function renderSubscriptionsReport() {
  try {
    const res = await API.getSubscriptionsMatrix(currentFY);
    if (!res.success) return;

    const months = res.months || [];
    const matrix = res.matrix || [];

    const thead = document.getElementById('subsMatrixHead');
    const tbody = document.getElementById('subsMatrixBody');

    if (thead) {
      thead.innerHTML = `
        <tr style="background: var(--bg-slate-50); border-bottom: 2px solid var(--border); font-size: 0.75rem; color: var(--text-muted);">
          <th style="padding: 10px 8px; text-align: left; position: sticky; left: 0; background: var(--bg-slate-50); z-index: 2;">MEMBER</th>
          ${months.map(m => `<th style="padding: 10px 6px; text-align: right;">${m.substr(0, 3)}</th>`).join('')}
          <th style="padding: 10px 8px; text-align: right; color: #059669; font-weight: 800;">TOTAL (₹)</th>
        </tr>
      `;
    }

    if (tbody) {
      tbody.innerHTML = matrix.map(row => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 8px; font-weight: 700; color: var(--text-dark); position: sticky; left: 0; background: var(--card-bg); z-index: 1;">
            ${row.member_code} - ${row.name}
          </td>
          ${months.map(m => {
            const v = row.months[m] || 0;
            return `<td style="padding: 8px 6px; text-align: right; font-weight: ${v > 0 ? '700' : '400'}; color: ${v > 0 ? 'var(--text-dark)' : 'var(--text-muted)'};">${v > 0 ? v : '-'}</td>`;
          }).join('')}
          <td style="padding: 8px; text-align: right; font-weight: 800; color: #059669;">
            ${row.totalPaid > 0 ? formatCurrency(row.totalPaid) : '-'}
          </td>
        </tr>
      `).join('') || '<tr><td colspan="14" style="padding: 16px; text-align: center; color: var(--text-muted);">No subscriptions recorded</td></tr>';
    }
  } catch (err) {
    console.error('Failed to load subscriptions matrix:', err);
  }
}

// 13. Official Member Statement
function renderOfficialStatement(code) {
  const container = document.getElementById('stmtDetailsContent');
  if (!container) return;

  const mem = cachedMembers.find(m => m.member_code === code) || { member_code: code, name: 'Member ' + code, phone: '', address: 'Thadiyoor' };
  const txs = cachedTransactions.filter(t => t.member_code === code && !t.is_cancelled);
  const total = txs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 0.9rem;">
      <div>
        <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">${mem.name}</div>
        <div style="color: #475569; margin-top: 2px;">Code: <strong style="color: #059669;">${mem.member_code}</strong></div>
        <div style="color: #475569; margin-top: 2px;">Address: ${mem.address || 'IPC Horeb, Thadiyoor'}</div>
      </div>
      <div style="text-align: right;">
        <div style="color: #475569;">Financial Year: <strong>${currentFY}</strong></div>
        <div style="color: #475569; margin-top: 2px;">Date: ${new Date().toLocaleDateString('en-GB')}</div>
        <div style="margin-top: 4px; font-size: 1.1rem; font-weight: 800; color: #059669;">Total Paid: ${formatCurrency(total)}</div>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: left; font-size: 0.8rem; color: #475569;">
          <th style="padding: 8px 10px;">DATE</th>
          <th style="padding: 8px 10px;">RECEIPT NO</th>
          <th style="padding: 8px 10px;">PARTICULARS</th>
          <th style="padding: 8px 10px;">MONTH</th>
          <th style="padding: 8px 10px; text-align: right;">AMOUNT (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${txs.map(t => `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.85rem;">
            <td style="padding: 8px 10px;">${t.date}</td>
            <td style="padding: 8px 10px; font-weight: 700;">${t.vr_no}</td>
            <td style="padding: 8px 10px;">${t.subtype || t.type}</td>
            <td style="padding: 8px 10px;">${t.sub_month || '-'}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #059669;">${formatCurrency(t.amount)}</td>
          </tr>
        `).join('') || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #94a3b8;">No contributions found</td></tr>'}
      </tbody>
    </table>
  `;
}

// 14. Suspense Account
function renderSuspenseTable() {
  const tbody = document.getElementById('suspenseTableBody');
  if (!tbody) return;
  const filtered = cachedTransactions.filter(t => 
    (!t.member_code && t.mode === 'Receipt' && !t.is_cancelled) || 
    (t.subtype && t.subtype.toLowerCase().includes('suspense'))
  );
  tbody.innerHTML = filtered.map(t => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 14px;">${t.date}</td>
      <td style="padding: 10px 14px; font-weight: 700;">${t.vr_no}</td>
      <td style="padding: 10px 14px;">${t.account_name}</td>
      <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #d97706;">${formatCurrency(t.amount)}</td>
      <td style="padding: 10px 14px; text-align: center;">
        <span style="font-size: 0.75rem; background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Unassigned</span>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">No entries in Suspense Account</td></tr>';
}

// 15. Settings Tab
async function loadSettings() {
  try {
    const [opRes, usersRes] = await Promise.all([
      API.getOpeningBalances(),
      API.getUsers()
    ]);
    const op = (opRes.balances || []).find(o => o.financial_year === currentFY) || opRes.balances[0];
    if (op) {
      document.getElementById('opCashInput').value = op.cash_amount || 127005;
      document.getElementById('opSbiCurrentInput').value = op.sbi_current_amount || 143068.37;
      document.getElementById('opSbiFdInput').value = op.sbi_fd_amount || 108022;
    }

    const uList = document.getElementById('settingsUsersList');
    if (uList && usersRes.users) {
      uList.innerHTML = usersRes.users.map(u => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-slate-50); border: 1px solid var(--border); border-radius: 8px;">
          <div>
            <div style="font-weight: 700; color: var(--text-dark);">${u.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${u.email}</div>
          </div>
          <span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">${u.role}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function handleSaveOpeningBalances(e) {
  e.preventDefault();
  const cash = parseFloat(document.getElementById('opCashInput').value) || 0;
  const sbi = parseFloat(document.getElementById('opSbiCurrentInput').value) || 0;
  const fd = parseFloat(document.getElementById('opSbiFdInput').value) || 0;

  try {
    await API.saveOpeningBalances({
      financial_year: currentFY,
      cash_amount: cash,
      sbi_current_amount: sbi,
      sbi_fd_amount: fd
    });
    showToast('Opening balances saved successfully! 📅');
    await loadDashboardData();
  } catch (err) {
    showToast(err.message || 'Failed to save opening balances', 'error');
  }
}

// Add Member Modal handlers
function openAddMemberModal() {
  const modal = document.getElementById('addMemberModal');
  if (modal) modal.style.display = 'flex';
  const nextNum = cachedMembers.length + 1;
  const codeInput = document.getElementById('newMemberCode');
  if (codeInput) codeInput.value = `H-${nextNum}`;
}

function closeAddMemberModal() {
  const modal = document.getElementById('addMemberModal');
  if (modal) modal.style.display = 'none';
}

async function handleAddMemberSubmit(e) {
  e.preventDefault();
  const code = document.getElementById('newMemberCode').value.trim();
  const name = document.getElementById('newMemberName').value.trim();
  const phone = document.getElementById('newMemberPhone').value.trim();
  const address = document.getElementById('newMemberAddress').value.trim();

  try {
    await API.addMember({ member_code: code, name, phone, address, status: 'Active' });
    showToast(`Member ${name} (${code}) added successfully! 👤`);
    closeAddMemberModal();
    // Refresh members
    const memRes = await API.getMembers();
    cachedMembers = memRes.members || [];
    populateInitialDropdowns();
    if (currentTab === 'membersDirectoryTab') renderMembersDirectory(cachedMembers);
  } catch (err) {
    showToast(err.message || 'Failed to add member', 'error');
  }
}

function onFinancialYearChanged(fy) {
  currentFY = fy;
  showToast(`Switched Financial Year to ${fy}`, 'info');
  loadDashboardData();
}

function setupEventListeners() {
  // Mobile drawer backdrop click
  const backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) backdrop.addEventListener('click', toggleSidebar);
}
