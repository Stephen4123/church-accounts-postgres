async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/sync/all');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Success:', data.success);
    console.log('Transactions count:', (data.transactions || []).length);
    console.log('Bank transactions count:', (data.bank_transactions || []).length);
    console.log('Members count:', (data.members || []).length);
    console.log('Opening balances:', Object.keys(data.opening_balances || {}));
    console.log('First 2 transactions:', (data.transactions || []).slice(0, 2));
    console.log('First 2 bank transactions:', (data.bank_transactions || []).slice(0, 2));
  } catch (e: any) {
    console.error('Fetch error:', e.message);
  }
}

test().then(() => process.exit(0));
