// ===================================================
// pendapatan-iuran.js — Live Data dari Google Sheets Publish to Web (CSV)
// ===================================================

const URL_KESEPAKATAN = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTaZXQznuc6ZSa-DKRcOsXH-UfmyvQsAp0TN4DYFC7a72ihr-Il6nAYnu7HlnzVx9nlXvPtUrKiOoBv/pub?output=csv&single=true&gid=33141721";
const URL_IURAN = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTaZXQznuc6ZSa-DKRcOsXH-UfmyvQsAp0TN4DYFC7a72ihr-Il6nAYnu7HlnzVx9nlXvPtUrKiOoBv/pub?output=csv&single=true&gid=71422965";

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

let membersData = []; // Gabungan Kesepakatan & Iuran
let activeMonthIdx = 0; // 0 for Januari, etc. (Default to current month or latest)
let chartTren = null;

// ---- Utility ----
function parseRp(str) {
  if (!str) return 0;
  const num = str.replace(/[^0-9,-]+/g, "").split(',')[0];
  return parseInt(num, 10) || 0;
}

function formatRp(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return "Rp " + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v);
}

// Parse CSV manually (handles quotes)
function parseCSV(text) {
  const lines = text.split('\n');
  return lines.map(line => {
    const row = [];
    let insideQuote = false;
    let currentWord = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i+1] === '"') {
        currentWord += '"';
        i++;
      } else if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(currentWord);
        currentWord = '';
      } else {
        currentWord += char;
      }
    }
    row.push(currentWord.replace(/\r$/, ''));
    return row;
  });
}

// ---- Data Fetching ----
async function fetchAllData() {
  const [resKes, resIuran] = await Promise.all([
    fetch(URL_KESEPAKATAN).then(res => res.text()),
    fetch(URL_IURAN).then(res => res.text())
  ]);

  const csvKes = parseCSV(resKes);
  const csvIuran = parseCSV(resIuran);

  // Headers are in row 1 (index 0)
  // Kesepakatan: No., Nama Lemaga, Skala, Iuran / Bulan
  // Iuran: No., Nama Lemaga, Skala, Januari, Februari, ..., Desember

  const kesData = csvKes.slice(1);
  const iuranData = csvIuran.slice(1);

  membersData = [];

  for (let i = 0; i < iuranData.length; i++) {
    const rowIuran = iuranData[i];
    if (!rowIuran[1] || rowIuran[1].trim() === '') continue; // Skip empty rows

    const nama = rowIuran[1].trim();
    const skala = rowIuran[2]?.trim() || '';
    
    // Find matching Kesepakatan row
    const rowKes = kesData.find(r => r[1] && r[1].trim() === nama);
    const iuranBulanStr = rowKes ? rowKes[3] : '0';
    const iuranBulan = parseRp(iuranBulanStr);

    const monthlyStatus = [];
    // Months start from index 3 (Januari) to 14 (Desember)
    for (let m = 0; m < 12; m++) {
      const statusStr = rowIuran[3 + m] ? rowIuran[3 + m].trim() : '';
      let status = 'belum'; // default
      if (statusStr === '-') {
        status = 'na';
      } else if (statusStr !== '') {
        status = 'lunas'; // Has date
      }
      monthlyStatus.push({
        raw: statusStr,
        status: status
      });
    }

    membersData.push({
      nama,
      skala,
      iuranBulan,
      monthlyStatus
    });
  }

  const d = new Date();
  activeMonthIdx = 0; 
}

// ---- UI Updates ----
function updateDashboard() {
  updateKPIs();
  renderTable();
}

function updateKPIs() {
  let wajib = 0;
  let lunas = 0;
  let nominal = 0;
  let potensi = 0;

  membersData.forEach(m => {
    const st = m.monthlyStatus[activeMonthIdx];
    if (st.status !== 'na') {
      wajib++;
      potensi += m.iuranBulan;
      if (st.status === 'lunas') {
        lunas++;
        nominal += m.iuranBulan;
      }
    }
  });

  const persen = wajib > 0 ? (lunas / wajib * 100).toFixed(1) : 0;

  document.getElementById('kpi-wajib').textContent = wajib;
  document.getElementById('kpi-lunas').textContent = lunas;
  document.getElementById('kpi-persen').textContent = persen + '%';
  document.getElementById('kpi-nominal').textContent = formatRp(nominal);
  document.getElementById('kpi-potensi').textContent = 'Potensi: ' + formatRp(potensi);
}

function renderTable() {
  const tbody = document.querySelector('#rincian-table tbody');
  const searchQ = document.getElementById('search-input').value.toLowerCase();
  const filterSt = document.getElementById('status-filter').value;

  tbody.innerHTML = '';
  
  let no = 1;
  membersData.forEach(m => {
    if (searchQ && !m.nama.toLowerCase().includes(searchQ)) return;
    
    const st = m.monthlyStatus[activeMonthIdx];
    
    if (filterSt !== 'all' && st.status !== filterSt) return;

    let badgeClass = '';
    let badgeText = '';
    
    if (st.status === 'lunas') {
      badgeClass = 'lunas';
      badgeText = '<i class="fas fa-check"></i> Lunas (' + st.raw + ')';
    } else if (st.status === 'belum') {
      badgeClass = 'belum';
      badgeText = '<i class="fas fa-times"></i> Belum Bayar';
    } else {
      badgeClass = 'na';
      badgeText = '-';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${no++}</td>
      <td style="font-weight:500;">${m.nama}</td>
      <td>${m.skala}</td>
      <td>${formatRp(m.iuranBulan)}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTrenChart() {
  const ctx = document.getElementById('chart-tren');
  if (!ctx) return;
  if (chartTren) { chartTren.destroy(); chartTren = null; }

  const nominalTerkumpul = [];
  const tingkatKepatuhan = [];

  for (let m = 0; m < 12; m++) {
    let w = 0, l = 0, nom = 0;
    membersData.forEach(mem => {
      const st = mem.monthlyStatus[m];
      if (st.status !== 'na') {
        w++;
        if (st.status === 'lunas') {
          l++;
          nom += mem.iuranBulan;
        }
      }
    });
    nominalTerkumpul.push(nom);
    tingkatKepatuhan.push(w > 0 ? (l / w * 100) : 0);
  }

  chartTren = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: 'Nominal Terkumpul (Rp)',
          data: nominalTerkumpul,
          backgroundColor: '#8b5cf6',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Tingkat Kepatuhan (%)',
          data: tingkatKepatuhan,
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          borderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.datasetIndex === 0) {
                return ' ' + formatRp(context.raw);
              }
              return ' ' + context.raw.toFixed(1) + '%';
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { callback: function(val) { return 'Rp ' + (val/1000000) + ' Jt'; } }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          min: 0, max: 100,
          ticks: { callback: function(val) { return val + '%'; } }
        }
      }
    }
  });
}

// ---- Init ----
async function initDashboard() {
  const loadingState = document.getElementById('loading-state');
  const dashboardContent = document.getElementById('dashboard-content');
  if (loadingState) loadingState.style.display = 'block';
  if (dashboardContent) dashboardContent.style.display = 'none';

  try {
    await fetchAllData();

    // Populate month dropdown
    const sel = document.getElementById('month-select');
    if (sel) {
      sel.innerHTML = MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('');
      sel.addEventListener('change', (e) => {
        activeMonthIdx = parseInt(e.target.value);
        updateDashboard();
      });
    }

    // Attach filter listeners
    document.getElementById('search-input')?.addEventListener('input', renderTable);
    document.getElementById('status-filter')?.addEventListener('change', renderTable);

    if (loadingState) loadingState.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';

    updateDashboard();
    renderTrenChart();

  } catch (err) {
    if (loadingState) {
      loadingState.innerHTML = `
        <i class="fas fa-exclamation-circle" style="font-size:2rem; color:var(--red);"></i>
        <p style="margin-top:12px; color:var(--red);">Gagal mengambil data. Pastikan link Publish to Web valid.</p>
      `;
    }
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);
window.addEventListener('hazana:pjax-loaded', initDashboard);
