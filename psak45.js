// --- PSAK 45 Financial Report Module (Live Google Sheets Data) ---

const PSAK_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKL88ZG4XbFoYpEyPOOud0seaKiqJmzExGSFTikeDwFAeOc9i_uvcekq1Cfzh73fPfMQOmNULKVzTh/pub?output=csv";

function switchPsakTab(tab) {
  const btnBalance = document.getElementById('tab-balance');
  const btnAct = document.getElementById('tab-activities');
  const panelBalance = document.getElementById('psak-panel-balance');
  const panelAct = document.getElementById('psak-panel-activities');

  if (!btnBalance || !btnAct) return;

  if (tab === 'balance') {
    btnBalance.classList.add('active');
    btnAct.classList.remove('active');
    panelBalance.style.display = 'block';
    panelAct.style.display = 'none';
  } else {
    btnAct.classList.add('active');
    btnBalance.classList.remove('active');
    panelAct.style.display = 'block';
    panelBalance.style.display = 'none';
  }
}

function parsePsakCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const parseRow = row => {
    const res = [];
    let inQ = false, val = '';
    for (let c of row) {
      if (c === '"') inQ = !inQ;
      else if (c === ',' && !inQ) { res.push(val.trim()); val = ''; }
      else val += c;
    }
    res.push(val.trim());
    return res;
  };

  const headers = parseRow(lines[0]);
  const dates = headers.slice(2).filter(d => d && !d.toLowerCase().includes('tren') && !d.toLowerCase().includes('posisi'));

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    const cat = row[0] || '';
    const name = row[1] || '';
    if (!name) continue;

    const values = {};
    dates.forEach((d, idx) => {
      let raw = row[idx + 2] || '0';
      raw = raw.replace(/[^\d.-]/g, '');
      values[d] = parseFloat(raw) || 0;
    });

    items.push({ category: cat, name, values });
  }

  return { dates, items };
}

function fmtRp(val) {
  if (isNaN(val)) return '0';
  return Math.abs(val).toLocaleString('id-ID');
}

async function initPsak45() {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('dashboard-content');
  const dateSelect = document.getElementById('psak-date-select');

  try {
    const res = await fetch(`${PSAK_CSV_URL}&_cb=${Date.now()}`);
    const text = await res.text();
    const parsed = parsePsakCSV(text);

    if (parsed && parsed.dates.length > 0) {
      const dates = parsed.dates;
      const latestDate = dates[dates.length - 1];

      if (dateSelect) {
        dateSelect.innerHTML = dates.map(d => `<option value="${d}">${d}</option>`).join('');
        dateSelect.value = latestDate;
      }

      // Calculate totals
      let bankVal = 0, titipanVal = 0, fozVal = 0, piutangVal = 0;

      parsed.items.forEach(item => {
        const val = item.values[latestDate] || 0;
        const nameLower = item.name.toLowerCase();

        if (nameLower.includes('bata') || nameLower.includes('bsi') || nameLower.includes('bri') || nameLower.includes('kas')) {
          bankVal += val;
        }
        if (nameLower.includes('titipan') || nameLower.includes('interest')) {
          titipanVal += Math.abs(val);
        }
        if (nameLower.includes('piutang')) {
          piutangVal += val;
        }
        if (nameLower.includes('saldo net') || nameLower.includes('foz')) {
          fozVal += val;
        }
      });

      if (fozVal === 0) fozVal = bankVal - titipanVal;
      const totalAset = bankVal + piutangVal;

      // Update KPI DOM
      const elAset = document.getElementById('kpi-psak-aset');
      const elUnrestricted = document.getElementById('kpi-psak-unrestricted');
      const elRestricted = document.getElementById('kpi-psak-restricted');

      if (elAset) elAset.textContent = `Rp ${fmtRp(totalAset)}`;
      if (elUnrestricted) elUnrestricted.textContent = `Rp ${fmtRp(fozVal)}`;
      if (elRestricted) elRestricted.textContent = `Rp ${fmtRp(titipanVal)}`;

      // Update Table Rows
      const rowBank = document.getElementById('row-bank-val');
      const rowPiutang = document.getElementById('row-piutang-val');
      const rowTotalAset = document.getElementById('row-total-aset');
      const rowTitipan = document.getElementById('row-titipan-val');
      const rowTotalLiabilitas = document.getElementById('row-total-liabilitas');
      const rowNetoUnrestricted = document.getElementById('row-neto-unrestricted');
      const rowNetoRestricted = document.getElementById('row-neto-restricted');
      const rowTotalBalance = document.getElementById('row-total-balance');

      if (rowBank) rowBank.textContent = fmtRp(bankVal);
      if (rowPiutang) rowPiutang.textContent = fmtRp(piutangVal);
      if (rowTotalAset) rowTotalAset.textContent = fmtRp(totalAset);
      if (rowTitipan) rowTitipan.textContent = fmtRp(titipanVal);
      if (rowTotalLiabilitas) rowTotalLiabilitas.textContent = fmtRp(titipanVal);
      if (rowNetoUnrestricted) rowNetoUnrestricted.textContent = fmtRp(fozVal);
      if (rowNetoRestricted) rowNetoRestricted.textContent = fmtRp(titipanVal);
      if (rowTotalBalance) rowTotalBalance.textContent = fmtRp(totalAset);
    }
  } catch (err) {
    console.warn('Live fetch for PSAK 45 failed, fallback to defaults:', err);
  }

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initPsak45);
window.pjaxInitDashboard = initPsak45;
