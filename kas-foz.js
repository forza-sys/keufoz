(function() {

// =============================================
// kas-foz.js — Data via Google Sheets Publish to Web (gviz API)
// No Apps Script needed, no CORS issues
// =============================================

const SPREADSHEET_ID = '181CZUA-74uh-8yLJO_iI5aMtaBYMl4p2IdnOOg38Cas';
const GVIZ_BASE = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=`;

const DETAIL_SHEETS = [
  'Kas Kecil', 'Administrasi dan Umum', 'Overhead dan Tagihan',
  'Pembelian Aset dan Peralatan', 'Pemeliharaan Kendaraan dan Bang',
  'Donasi atau Bantuan', 'Bidang 1', 'Bidang 2', 'Bidang 3',
  'Bidang 4', 'Bidang 5', 'Syarikat Amil', 'Pengurus Harian',
  'Networking Nasional & Global', 'Enrichment Karyawan FOZ',
  'Global Sumud Flotilla', 'Perjalanan ke Surabaya - Persia',
  'Raker Bidang 4', 'Tata Kelola FOZ', 'DANTIP SAI', 'Kampus Zakat',
  'Kompartemen Halal', 'Research Hub', 'ZGTC',
  'Kolaborasi Bantuan Sumatera', 'Leaders Talk Offline',
  'Market Hub - Program Digizakat', 'UL 2', 'Cashbon',
  'Detail251-Dana Titipan-Digizaka', 'Kolaborasi Bantuan Sumatera Cha',
  'Riset Lumpur'
];

const PAGU_MAP = {
  'Kas Kecil': 'Kas Kecil',
  'Tagihan Subscription': 'Overhead dan Tagihan',
  'Bantuan Sosial': 'Donasi atau Bantuan',
  'Pemeliharaan Aset': 'Pembelian Aset dan Peralatan',
  'Bidang 1': 'Bidang 1',
  'Bidang 2': 'Bidang 2',
  'Bidang 3': 'Bidang 3',
  'Bidang 4': 'Bidang 4',
  'Bidang 5': 'Bidang 5',
  'Syarikat Amil': 'Syarikat Amil',
  'Pengurus Harian': 'Pengurus Harian',
  'Gaji Karyawan': null,
  'Pulsa Karyawan': null,
  'Konsumsi Team Magang': null,
  'Tunjangan Kesehatan Karyawan': null
};

let ALL_DATA = null;
let activeFilter = 'Semua';
let chartPagu = null;
let chartKomp = null;

// ---- Utility ----
function formatRp(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const str = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(abs);
  return (v < 0 ? "-Rp " : "Rp ") + str;
}

// Parse Google Visualization API response (JSONP-like)
function parseGvizResponse(text) {
  const start = text.indexOf('(');
  const end = text.lastIndexOf(')');
  if (start === -1 || end === -1) throw new Error('Invalid gviz response');
  return JSON.parse(text.substring(start + 1, end));
}

// Fetch a single sheet via gviz API
async function fetchSheet(sheetName) {
  const url = GVIZ_BASE + encodeURIComponent(sheetName);
  const res = await fetch(url);
  const text = await res.text();
  return parseGvizResponse(text);
}

// Get cell value from gviz row
function cellVal(row, colIdx) {
  if (!row || !row.c || !row.c[colIdx]) return null;
  return row.c[colIdx].v;
}

// ---- Data Processing ----
async function fetchAllData() {
  const loadingText = document.querySelector('#loading-state p');

  // 1. Fetch Pagu sheet
  if (loadingText) loadingText.textContent = 'Mengambil data Pagu...';
  const paguGviz = await fetchSheet('Pagu');
  const paguList = [];
  if (paguGviz.table && paguGviz.table.rows) {
    paguGviz.table.rows.forEach(row => {
      const pos = cellVal(row, 0);  // Column A
      const nominal = cellVal(row, 1);  // Column B
      if (!pos || typeof pos !== 'string') return;
      if (pos.toLowerCase().startsWith('total')) return;
      if (typeof nominal === 'number' && nominal > 0) {
        paguList.push({ pos: pos.trim(), nominal: nominal });
      }
    });
  }

  // 2. Fetch all detail sheets in parallel (batches of 8)
  if (loadingText) loadingText.textContent = 'Mengambil data transaksi...';
  const sheetResults = [];
  const batchSize = 8;

  for (let i = 0; i < DETAIL_SHEETS.length; i += batchSize) {
    const batch = DETAIL_SHEETS.slice(i, i + batchSize);
    const batchPromises = batch.map(async (name) => {
      try {
        const gviz = await fetchSheet(name);
        return { name, gviz, error: null };
      } catch (e) {
        console.warn(`Failed to fetch sheet "${name}":`, e);
        return { name, gviz: null, error: e };
      }
    });
    const results = await Promise.all(batchPromises);
    sheetResults.push(...results);
    if (loadingText) loadingText.textContent = `Mengambil data transaksi... (${Math.min(i + batchSize, DETAIL_SHEETS.length)}/${DETAIL_SHEETS.length})`;
  }

  // 3. Process detail sheets
  const sheets = [];
  sheetResults.forEach(({ name, gviz, error }) => {
    if (error || !gviz || !gviz.table) {
      sheets.push({
        name, kategoriKas: '', kategoriProgram: '',
        totalPengeluaran: 0, transaksiCount: 0, lastTransaction: ''
      });
      return;
    }

    const rows = gviz.table.rows || [];

    // H2 total is at row index 0 (first data row after gviz header), column 7 (H)
    // But gviz might skip empty rows, so we need to find the total differently
    // Row 0 in gviz = row 1 in spreadsheet (empty)
    // Actually, gviz includes the header row based on how Google parsed it
    // Let's find the total from H2 (second row in spreadsheet)

    let totalPengeluaran = 0;
    let kategoriKas = '';
    let kategoriProgram = '';
    let transaksiCount = 0;
    let lastTransaction = '';

    // The gviz response for these sheets has:
    // Row 0 = spreadsheet row 2 (Total Pengeluaran in F, value in H)
    // Row 1 = spreadsheet row 3 (empty / headers like "Kategori Kas")
    // Row 2 = spreadsheet row 4 (column headers: No, Tanggal, etc)
    // Row 3+ = spreadsheet row 5+ (data)

    // But gviz might merge header rows. Let's be smart about finding data.
    // Find the total from H column in early rows
    for (let r = 0; r < Math.min(3, rows.length); r++) {
      const fVal = cellVal(rows[r], 5); // Column F
      const hVal = cellVal(rows[r], 7); // Column H
      if (fVal && typeof fVal === 'string' && fVal.toLowerCase().includes('total')) {
        if (typeof hVal === 'number') {
          totalPengeluaran = hVal;
        }
        break;
      }
      // Also check if H has a number in the first few rows
      if (typeof hVal === 'number' && hVal > 100 && r < 2) {
        totalPengeluaran = hVal;
      }
    }

    // Find data rows (rows with a number in column A = No.)
    for (let r = 0; r < rows.length; r++) {
      const noVal = cellVal(rows[r], 0); // Column A (No)
      const catKas = cellVal(rows[r], 2); // Column C (Kategori Kas)
      const catProg = cellVal(rows[r], 3); // Column D (Kategorisasi Program)

      if (noVal !== null && typeof noVal === 'number') {
        transaksiCount++;
        if (!kategoriKas && catKas) kategoriKas = catKas;
        if (!kategoriProgram && catProg) kategoriProgram = catProg;

        // Check date in column B
        const dateVal = cellVal(rows[r], 1);
        if (dateVal && typeof dateVal === 'string' && dateVal.startsWith('Date')) {
          // gviz dates are "Date(2026,4,20)" format (month is 0-indexed)
          const match = dateVal.match(/Date\((\d+),(\d+),(\d+)\)/);
          if (match) {
            const y = match[1];
            const m = String(parseInt(match[2]) + 1).padStart(2, '0');
            const d = match[3].padStart(2, '0');
            const formatted = `${y}-${m}-${d}`;
            if (formatted > lastTransaction) lastTransaction = formatted;
          }
        }
      }
    }

    // If totalPengeluaran is still 0, compute from individual transactions
    if (totalPengeluaran === 0) {
      rows.forEach(row => {
        const noVal = cellVal(row, 0);
        const hVal = cellVal(row, 7); // Column H (Kredit)
        if (noVal !== null && typeof noVal === 'number' && typeof hVal === 'number') {
          totalPengeluaran += hVal;
        }
      });
    }

    sheets.push({
      name, kategoriKas, kategoriProgram,
      totalPengeluaran, transaksiCount, lastTransaction
    });
  });

  return { pagu: paguList, sheets: sheets };
}

// ---- Init ----
async function init() {
  const loadingState = document.getElementById('loading-state');
  const dashboardContent = document.getElementById('dashboard-content');

  try {
    if (loadingState) loadingState.style.display = 'block';
    if (dashboardContent) dashboardContent.style.display = 'none';

    ALL_DATA = await fetchAllData();

    if (loadingState) loadingState.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';

    renderKPIs(ALL_DATA);
    renderHealthTable(ALL_DATA, activeFilter);
    renderCharts(ALL_DATA);
  } catch (err) {
    if (loadingState) {
      loadingState.innerHTML = `
        <i class="fas fa-exclamation-circle" style="font-size:2rem; color:var(--red);"></i>
        <p style="margin-top:12px; color:var(--red);">Gagal mengambil data: ${err.message}</p>
      `;
    }
    console.error(err);
  }
}

// ---- Pagu Lookup ----
function buildPaguLookup(paguArray) {
  const lookup = {};
  if (!Array.isArray(paguArray)) return lookup;
  paguArray.forEach(p => { lookup[p.pos] = p.nominal || 0; });
  return lookup;
}

function findPaguForSheet(sheetName, paguLookup) {
  if (paguLookup[sheetName] !== undefined) return paguLookup[sheetName];
  for (const [paguName, mappedSheet] of Object.entries(PAGU_MAP)) {
    if (mappedSheet === sheetName && paguLookup[paguName] !== undefined) {
      return paguLookup[paguName];
    }
  }
  return 0;
}

// ---- Render KPIs ----
function renderKPIs(data) {
  let totalPeng = 0;
  let totalPagu = 0;
  let totalTrans = 0;

  if (data.sheets) {
    data.sheets.forEach(s => {
      totalPeng += s.totalPengeluaran || 0;
      totalTrans += s.transaksiCount || 0;
    });
  }

  if (data.pagu && Array.isArray(data.pagu)) {
    data.pagu.forEach(p => { totalPagu += p.nominal || 0; });
  }

  const persen = totalPagu > 0 ? (totalPeng / totalPagu) * 100 : 0;

  document.getElementById('kpi-total-pengeluaran').textContent = formatRp(totalPeng);
  document.getElementById('kpi-pagu').textContent = formatRp(totalPagu);
  document.getElementById('kpi-persen').textContent = persen.toFixed(1) + '%';
  const elSisa = document.getElementById('kpi-sisa-saldo');
  if (elSisa) elSisa.textContent = formatRp(totalPagu - totalPeng);

  const cardPersen = document.getElementById('kpi-card-persen');
  if (cardPersen) {
    cardPersen.className = 'kpi-card';
    if (persen <= 70) cardPersen.classList.add('green');
    else if (persen < 95) cardPersen.classList.add('amber');
    else cardPersen.classList.add('red');
  }
}

// ---- Render Health Table ----
function renderHealthTable(data, filter) {
  const tbody = document.getElementById('health-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!data.sheets) return;

  const paguLookup = buildPaguLookup(data.pagu);

  let filtered = data.sheets;
  if (filter !== 'Semua') {
    filtered = filtered.filter(s => s.kategoriKas === filter);
  }

  const rows = filtered.map(s => {
    const paguValue = findPaguForSheet(s.name, paguLookup);
    const pengeluaran = s.totalPengeluaran || 0;

    let persen = null;
    let statusBadge = '';
    let fillColor = '';

    if (paguValue > 0) {
      persen = (pengeluaran / paguValue) * 100;
      if (persen <= 70) {
        statusBadge = '<span class="badge badge-sehat">🟢 Sehat</span>';
        fillColor = '#10b981';
      } else if (persen < 95) {
        statusBadge = '<span class="badge badge-hatihati">🟡 Hati-hati</span>';
        fillColor = '#f59e0b';
      } else {
        statusBadge = '<span class="badge badge-over">🔴 Over Budget</span>';
        fillColor = '#ef4444';
      }
    } else {
      statusBadge = '<span class="badge badge-none">⚪ Tanpa Pagu</span>';
    }

    return { ...s, paguValue, pengeluaran, persen, statusBadge, fillColor };
  });

  rows.sort((a, b) => {
    if (a.persen !== null && b.persen !== null) return b.persen - a.persen;
    if (a.persen !== null) return -1;
    if (b.persen !== null) return 1;
    return b.pengeluaran - a.pengeluaran;
  });

  let html = '';
  rows.forEach((r, i) => {
    let progressHtml = '';
    if (r.persen !== null) {
      const fillWidth = Math.min(r.persen, 100);
      progressHtml = `
        <div style="font-size:0.8rem; font-weight:600;">${r.persen.toFixed(1)}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${fillWidth}%; background-color: ${r.fillColor};"></div></div>
      `;
    } else {
      progressHtml = '<div style="font-size:0.8rem; color:var(--text-muted)">—</div>';
    }

    html += `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td style="font-weight:600">${r.name}</td>
        <td>${r.kategoriKas || '—'}</td>
        <td style="text-align:right">${r.paguValue > 0 ? formatRp(r.paguValue) : '—'}</td>
        <td style="text-align:right">${formatRp(r.pengeluaran)}</td>
        <td style="text-align:right">${r.paguValue > 0 ? formatRp(r.paguValue - r.pengeluaran) : '—'}</td>
        <td style="text-align:right; padding-right:15px">${progressHtml}</td>
        <td style="text-align:center">${r.statusBadge}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html || `<tr><td colspan="8" class="empty-state">Tidak ada data.</td></tr>`;
}

// ---- Render Charts ----
function renderCharts(data) {
  if (!data.sheets) return;

  // Pagu vs Realisasi bar chart
  const ctxPagu = document.getElementById('chart-pagu-realisasi');
  if (ctxPagu && chartPagu) chartPagu.destroy();

  const paguLookup = buildPaguLookup(data.pagu);
  let itemsWithPagu = data.sheets.map(s => {
    const paguValue = findPaguForSheet(s.name, paguLookup);
    return { name: s.name, pagu: paguValue, realisasi: s.totalPengeluaran || 0 };
  }).filter(s => s.pagu > 0);

  itemsWithPagu.sort((a, b) => b.realisasi - a.realisasi);
  const top10 = itemsWithPagu.slice(0, 10);

  if (ctxPagu) {
    chartPagu = new Chart(ctxPagu, {
      type: 'bar',
      data: {
        labels: top10.map(i => i.name.length > 18 ? i.name.substring(0, 18) + '…' : i.name),
        datasets: [
          { label: 'Realisasi', data: top10.map(i => i.realisasi), backgroundColor: '#3b82f6' },
          { label: 'Pagu', data: top10.map(i => i.pagu), backgroundColor: '#e5e7eb' }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + formatRp(ctx.raw) } }
        }
      }
    });
  }

  // Komposisi per Kategori donut chart
  const ctxKomp = document.getElementById('chart-komposisi');
  if (ctxKomp && chartKomp) chartKomp.destroy();

  const categorySums = {};
  data.sheets.forEach(s => {
    const cat = s.kategoriKas || 'Lainnya';
    categorySums[cat] = (categorySums[cat] || 0) + (s.totalPengeluaran || 0);
  });

  const catLabels = Object.keys(categorySums);
  const catValues = Object.values(categorySums);

  if (ctxKomp) {
    chartKomp = new Chart(ctxKomp, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catValues,
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#0d9488', '#ec4899'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
          tooltip: { callbacks: { label: ctx => ' ' + formatRp(ctx.raw) } }
        }
      }
    });
  }
}

// ---- Filter Category ----
window.filterCategory = function(cat) {
  activeFilter = cat;

  const badge = document.getElementById('filter-badge');
  if (badge) badge.textContent = cat;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.textContent.trim() === cat) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  if (ALL_DATA) {
    renderHealthTable(ALL_DATA, activeFilter);
  }
};

// ---- Event Listeners ----
document.addEventListener('DOMContentLoaded', init);
window.pjaxInitDashboard = init;
})();

