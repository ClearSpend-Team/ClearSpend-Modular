import { sb } from './supabase.js';
import { openAuth } from './auth.js';

let roadmapBills = [];
let debtList = [];
let committed = 0;
let userPlan = 'GUEST'; // Default tier security status

// Format inputs cleanly as cash values ($1,250.00)
function formatCurrency(i) {
    let v = i.value.replace(/\D/g, "");
    v = (v / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    i.value = v === '$0.00' ? '' : v;
}

// Convert input text string back to raw float number for mathematical formulas
function parseVal(s) {
    return parseFloat(s.replace(/[$,]/g, "")) || 0;
}

function updateFreq() {
    document.getElementById('in-days').value = document.getElementById('in-freq').value;
    runCalc();
}

function addDebt() {
    if (userPlan !== 'PRO') {
        document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    const n = document.getElementById('debt-name').value.trim();
    const a = parseVal(document.getElementById('debt-amt').value);
    if (!n || !a) return;
    debtList.push({ name: n, amt: a });
    document.getElementById('debt-name').value = '';
    document.getElementById('debt-amt').value = '';
    renderDebts();
    runCalc();
}

function removeDebt(i) {
    if (userPlan !== 'PRO') return;
    debtList.splice(i, 1);
    renderDebts();
    runCalc();
}

function renderDebts() {
    const list = document.getElementById('debt-list');
    if (!list) return;
    list.innerHTML = '';
    debtList.forEach((d, idx) => {
        list.innerHTML += `<div class="data-row"><span>${d.name}: $${d.amt.toLocaleString(undefined, {minimumFractionDigits:2})}</span><span class="remove-btn" data-idx="${idx}">×</span></div>`;
    });
    
    list.querySelectorAll('.remove-btn').forEach(btn => {
        btn.onclick = (e) => removeDebt(parseInt(e.target.getAttribute('data-idx')));
    });
}

function addBill() {
    if (userPlan !== 'PRO') {
        document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    const n = document.getElementById('bill-name').value.trim();
    const a = parseVal(document.getElementById('bill-amt').value);
    const d = document.getElementById('bill-due').value;
    if (!n || !a || !d) return;
    roadmapBills.push({ name: n, amt: a, due: new Date(d), paid: [] });
    document.getElementById('bill-name').value = '';
    document.getElementById('bill-amt').value = '';
    document.getElementById('bill-due').value = '';
    renderRoadmap();
    runCalc();
}

function removeBill(i) {
    if (userPlan !== 'PRO') return;
    roadmapBills.splice(i, 1);
    renderRoadmap();
    runCalc();
}

function toggleB(bi, ci) {
    if (userPlan !== 'PRO') return;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!roadmapBills[bi].paid.some(p => p.idx === ci)) {
        roadmapBills[bi].paid.push({ idx: ci, date: dateStr });
    } else {
        roadmapBills[bi].paid = roadmapBills[bi].paid.filter(p => p.idx !== ci);
    }
    renderRoadmap();
    runCalc();
}

function renderRoadmap() {
    const list = document.getElementById('roadmap-list');
    if (!list) return;
    list.innerHTML = '';
    committed = 0;
    
    const freq = +document.getElementById('in-freq').value || 14;
    const nextPayStr = document.getElementById('in-payday').value;
    const nextPay = nextPayStr ? new Date(nextPayStr + 'T00:00:00') : new Date();
    
    roadmapBills.forEach((b, i) => {
        const dueDate = new Date(b.due + 'T00:00:00');
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const diffTime = dueDate - today;
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const checks = Math.max(1, Math.floor(days / freq) + 1);
        const slice = b.amt / checks;
        
        b.paid.forEach(p => {
            if (p.idx < checks) committed += slice;
        });

        let bubbles = '';
        for (let j = 0; j < checks; j++) {
            const pInfo = b.paid.find(p => p.idx === j);
            let bDate = new Date(nextPay.getTime());
            bDate.setDate(bDate.getDate() + (j * freq));
            const bubbleDateStr = bDate.toLocaleDateString('en-US', {month:'short', day:'numeric'});
            
            bubbles += `<div class="bubble ${pInfo ? 'paid' : ''}" data-bi="${i}" data-ci="${j}">
                $${slice.toFixed(0)}
                <span class="bubble-date">${pInfo ? pInfo.date : bubbleDateStr}</span>
            </div>`;
        }
        
        const paidCount = b.paid.filter(p => p.idx < checks).length;
        const pct = (paidCount / checks) * 100;
        let color = pct < 34 ? 'var(--red)' : pct < 100 ? 'var(--amber)' : 'var(--green)';
        
        list.innerHTML += `<div class="card" style="min-height:auto; margin-bottom:10px; padding:24px; border-left:10px solid ${color};">
            <div style="display:flex; justify-content:space-between">
                <b>${b.name} (Due in ${days} days)</b>
                <span>Total: $${b.amt.toLocaleString(undefined, {minimumFractionDigits:2})} <span class="remove-bill-btn" data-bi="${i}">×</span></span>
            </div>
            <div class="bubble-row">${bubbles}</div>
        </div>`;
    });

    list.querySelectorAll('.remove-bill-btn').forEach(btn => {
        btn.onclick = (e) => removeBill(parseInt(e.target.getAttribute('data-bi')));
    });
    list.querySelectorAll('.bubble').forEach(btn => {
        btn.onclick = (e) => {
            const target = e.currentTarget;
            toggleB(parseInt(target.getAttribute('data-bi')), parseInt(target.getAttribute('data-ci')));
        };
    });
}

// THE INTER-CONNECTED MATH ENGINE
function runCalc() {
    // 1. Snapshot Interlock -> Live Disposable Balance
    const inc = parseVal(document.getElementById('in-income').value);
    const bill = parseVal(document.getElementById('in-bills').value);
    const days = +document.getElementById('in-days').value || 14;
    const stateB = +document.getElementById('in-state').value || 1.0;
    
    // Core Formula Syncing Dynamic Bill-Slicing
    const safe = (inc - bill) - committed;
    const burn = safe / days;
    
    const displaySafe = document.getElementById('display-safe');
    if (displaySafe) {
        displaySafe.innerText = (safe < 0 ? '-' : '') + '$' + Math.abs(safe).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
    
    const statusT = document.getElementById('status-text');
    const card = document.getElementById('main-card');
    if (statusT && card) {
        statusT.innerText = 'Daily Limit: $' + burn.toFixed(2);
        card.classList.remove('halo-green', 'halo-yellow', 'halo-red');
        
        if (burn > (100 * stateB)) {
            statusT.style.color = "var(--green)";
            card.classList.add('halo-green');
        } else if (burn > (40 * stateB)) {
            statusT.style.color = "var(--amber)";
            card.classList.add('halo-yellow');
        } else {
            statusT.style.color = "var(--red)";
            card.classList.add('halo-red');
        }
    }
    
    // 2. Pro Annual Velocity Interlock -> Pro Debt Stack
    const yearly = parseVal(document.getElementById('in-annual').value);
    const totalDebt = debtList.reduce((acc, curr) => acc + curr.amt, 0);
    
    // Calculate Debt-to-Income Safety Index Matrix
    const ratio = (totalDebt / (yearly || 1)) * 100;
    const bar = document.getElementById('ratio-bar');
    const label = document.getElementById('ratio-label');
    
    if (bar && label) {
        if (yearly === 0 && totalDebt > 0) {
            bar.style.width = "100%";
            bar.style.background = 'var(--red)';
            label.innerText = "Status: Danger (No Salary Input)";
        } else if (totalDebt === 0) {
            bar.style.width = "0%";
            bar.style.background = 'var(--green)';
            label.innerText = "Status: Debt Free / Healthy";
        } else {
            bar.style.width = Math.min(100, ratio * 2) + "%";
            bar.style.background = ratio < 15 ? 'var(--green)' : ratio < 40 ? 'var(--amber)' : 'var(--red)';
            label.innerText = "Status: " + (ratio < 15 ? "Healthy" : ratio < 40 ? "Caution" : "Danger");
        }
    }
}

async function saveToCloud() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        openAuth('signup');
        return;
    }
    if (userPlan === 'GUEST' || userPlan === 'ESSENTIAL') {
        alert("Cloud syncing profile profiles requires a Founding Starter or Pro Pass status.");
        document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    const updates = {
        id: user.id,
        income: parseVal(document.getElementById('in-income').value),
        bills: parseVal(document.getElementById('in-bills').value),
        data_vault: { bills: roadmapBills, debts: debtList },
        updated_at: new Date()
    };
    
    const { error } = await sb.from('profiles').upsert(updates);
    if (error) alert("Sync Error: " + error.message);
    else alert("Vault Synced Successfully!");
}

// SECURITY GATEWAY: TIERS ACCESS MATRIX CONTROL
async function checkUser() {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
        const navAuth = document.getElementById('nav-auth');
        if (navAuth) {
            navAuth.innerHTML = `<div id="plan-badge" class="status-badge">...</div><span style="font-size:14px;font-weight:800;color:var(--navy);">${user.email}</span><button id="signout-btn" style="background:none;font-size:12px;margin-left:10px;color:var(--red);font-weight:800;cursor:pointer;">Sign Out</button>`;
            document.getElementById('signout-btn').onclick = () => sb.auth.signOut().then(() => location.reload());
        }
        
