import { sb } from './supabase.js';
import { openAuth } from './auth.js';

let roadmapBills = [];
let debtList = [];
let committed = 0;

// Format numbers into clean USD currency display as user types ($1,000.00)
function formatCurrency(i) {
    let v = i.value.replace(/\D/g, "");
    v = (v / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    i.value = v === '$0.00' ? '' : v;
}

// Convert dollar text string back to raw number for backend math formulas
function parseVal(s) {
    return parseFloat(s.replace(/[$,]/g, "")) || 0;
}

function updateFreq() {
    document.getElementById('in-days').value = document.getElementById('in-freq').value;
    runCalc();
}

function addDebt() {
    const n = document.getElementById('debt-name').value;
    const a = parseVal(document.getElementById('debt-amt').value);
    if (!n || !a) return;
    debtList.push({ name: n, amt: a });
    document.getElementById('debt-name').value = '';
    document.getElementById('debt-amt').value = '';
    renderDebts();
    runCalc();
}

function removeDebt(i) {
    debtList.splice(i, 1);
    renderDebts();
    runCalc();
}

function renderDebts() {
    const list = document.getElementById('debt-list');
    if (!list) return;
    list.innerHTML = '';
    debtList.forEach((d, idx) => {
        list.innerHTML += `<div class="data-row"><span>${d.name}: $${d.amt.toLocaleString()}</span><span class="remove-btn" data-idx="${idx}">×</span></div>`;
    });
    
    list.querySelectorAll('.remove-btn').forEach(btn => {
        btn.onclick = (e) => removeDebt(parseInt(e.target.getAttribute('data-idx')));
    });
}

function addBill() {
    const n = document.getElementById('bill-name').value;
    const a = parseVal(document.getElementById('bill-amt').value);
    const d = document.getElementById('bill-due').value;
    if (!n || !a || !d) return;
    roadmapBills.push({ name: n, amt: a, due: new Date(d), paid: [] });
    document.getElementById('bill-name').value = '';
    document.getElementById('bill-amt').value = '';
    renderRoadmap();
    runCalc();
}

function removeBill(i) {
    roadmapBills.splice(i, 1);
    renderRoadmap();
    runCalc();
}

function toggleB(bi, ci) {
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
    const nextPay = new Date(document.getElementById('in-payday').value || new Date());
    
    roadmapBills.forEach((b, i) => {
        const days = Math.ceil((new Date(b.due) - new Date()) / (1000 * 60 * 60 * 24));
        const checks = Math.max(1, Math.floor(days / freq) + 1);
        const slice = b.amt / checks;
        
        b.paid.forEach(p => {
            if (p.idx < checks) committed += slice;
        });

        let bubbles = '';
        for (let j = 0; j < checks; j++) {
            const pInfo = b.paid.find(p => p.idx === j);
            let bDate = new Date(nextPay);
            bDate.setDate(bDate.getDate() + (j * freq));
            bubbles += `<div class="bubble ${pInfo ? 'paid' : ''}" data-bi="${i}" data-ci="${j}">$${slice.toFixed(0)}${pInfo ? `<span class="bubble-date">${pInfo.date}</span>` : ''}</div>`;
        }
        
        list.innerHTML += `<div class="card" style="min-height:auto; margin-bottom:10px; padding:24px; border-left:10px solid ${percentColor(b.paid.length, checks)};"><div style="display:flex; justify-content:space-between"><b>${b.name} (Due in ${days} days)</b><span>Total: $${b.amt.toLocaleString()} <span class="remove-bill-btn" data-bi="${i}">×</span></span></div><div class="bubble-row">${bubbles}</div></div>`;
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

function percentColor(paid, total) {
    const pct = (paid / total) * 100;
    return pct < 34 ? 'var(--red)' : pct < 100 ? 'var(--amber)' : 'var(--green)';
}

function runCalc() {
    const inc = parseVal(document.getElementById('in-income').value);
    const bill = parseVal(document.getElementById('in-bills').value);
    const yearly = parseVal(document.getElementById('in-annual').value);
    const days = +document.getElementById('in-days').value || 14;
    const stateB = +document.getElementById('in-state').value || 1.0;
    
    const safe = (inc - bill) - committed;
    const burn = safe / days;
    
    document.getElementById('display-safe').innerText = '$' + safe.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
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
    
    const totalDebt = debtList.reduce((acc, curr) => acc + curr.amt, 0);
    const ratio = (totalDebt / (yearly || 1)) * 100;
    const bar = document.getElementById('ratio-bar');
    const label = document.getElementById('ratio-label');
    
    if (bar && label) {
        bar.style.width = Math.min(100, ratio * 2) + "%";
        bar.style.background = ratio < 15 ? 'var(--green)' : ratio < 40 ? 'var(--amber)' : 'var(--red)';
        label.innerText = "Status: " + (ratio < 15 ? "Healthy" : ratio < 40 ? "Caution" : "Danger");
    }
}

async function saveToCloud() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        openAuth('signup');
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

async function checkUser() {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
        const navAuth = document.getElementById('nav-auth');
        if (navAuth) {
            navAuth.innerHTML = `<div id="plan-badge" class="status-badge">...</div><span style="font-size:14px;font-weight:800;color:var(--navy);">${user.email}</span><button id="signout-btn" style="background:none;font-size:12px;margin-left:10px;color:var(--red);font-weight:800;">Sign Out</button>`;
            document.getElementById('signout-btn').onclick = () => sb.auth.signOut().then(() => location.reload());
        }
        
        const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
            const badge = document.getElementById('plan-badge');
            if (badge) {
                badge.style.display = 'block';
                badge.innerText = profile.plan || 'GUEST';
            }
            if (profile.plan === 'PRO') document.querySelectorAll('.pro-feat, #annual-box').forEach(el => el.classList.add('unlocked'));
            if (profile.plan === 'STARTER' || profile.plan === 'PRO') {
                const freqLock = document.getElementById('lock-freq');
                if (freqLock) freqLock.parentElement.style.display = 'none';
            }
            
            // Auto-repopulate snapshot inputs from the cloud values
            if (profile.income) {
                document.getElementById('in-income').value = '$' + profile.income.toLocaleString();
            }
            if (profile.bills) {
                document.getElementById('in-bills').value = '$' + profile.bills.toLocaleString();
            }
            if (profile.data_vault) {
                roadmapBills = profile.data_vault.bills || [];
                debtList = profile.data_vault.debts || [];
                renderDebts();
                renderRoadmap();
            }
            runCalc();
        }
    }
}

// Global Event Listeners setup (Replaces broken inline triggers)
window.addEventListener('DOMContentLoaded', () => {
    const bindInput = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', handler);
    };
    const bindChange = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', handler);
    };

    // Live listening for interactive typing updates
    bindInput('in-income', (e) => { formatCurrency(e.target); runCalc(); });
    bindInput('in-bills', (e) => { formatCurrency(e.target); runCalc(); });
    bindInput('in-annual', (e) => { formatCurrency(e.target); runCalc(); });
    bindInput('in-days', runCalc);
    
    bindChange('in-payday', runCalc);
    bindChange('in-freq', updateFreq);
    bindChange('in-state', runCalc);
    
    // Core engine interface button triggers
