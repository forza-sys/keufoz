(function() {

// ===================================================
// kas-komprehensif.js — Live Data from Google Sheets Publish to Web (CSV)
// No Apps Script needed, avoids multi-account CORS issues
// ===================================================

// ---- BULANAN (Pengeluaran & Pendapatan) DATA SOURCES ----
const SPREADSHEET_ID_FOZ = '181CZUA-74uh-8yLJO_iI5aMtaBYMl4p2IdnOOg38Cas';
const GVIZ_BASE = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID_FOZ}/gviz/tq?tqx=out:json&sheet=`;
const DETAIL_SHEETS = [
  'Kas Kecil', 'Administrasi dan Umum', 'Overhead dan Tagihan',
  'Pembelian Aset dan Peralatan', 'Pemeliharaan Kendaraan dan Bang',
  'Donasi atau Bantuan', 'Bidang 1', 'Bidang 2', 'Bidang 3',
  'Bidang 4', 'Bidang 5', 'Syarikat Amil', 'Pengurus Harian',
  'Networking Nasional & Global', 'Enrichment Karyawan FOZ',
  'Global Sumud Flotilla', 'Perjalanan ke Surabaya - Persia',
];

const URL_KESEPAKATAN = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTaZXQznuc6ZSa-DKRcOsXH-UfmyvQsAp0TN4DYFC7a72ihr-Il6nAYnu7HlnzVx9nlXvPtUrKiOoBv/pub?output=csv&single=true&gid=71422965";
const URL_IURAN = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTaZXQznuc6ZSa-DKRcOsXH-UfmyvQsAp0TN4DYFC7a72ihr-Il6nAYnu7HlnzVx9nlXvPtUrKiOoBv/pub?output=csv&single=true&gid=885646170";
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKL88ZG4XbFoYpEyPOOud0seaKiqJmzExGSFTikeDwFAeOc9i_uvcekq1Cfzh73fPfMQOmNULKVzTh/pub?output=csv";

// ---- Globals ----
let ALL_DATA     = null;   // raw API response
let DATES        = [];     // array of date strings
let ITEMS        = [];     // flat item array
let activeDateIdx = 0;     // index of selected date
let activeCard    = null;  // 'bank' | 'titipan' | 'foz' | 'piutang' | null
let activeTab     = 'posisi';  // 'posisi' | 'pencairan'
let chartTren    = null;
let chartKomp    = null;
let totalPaguOps = 136764793; // fallback

const PAGU_URL = "https://docs.google.com/spreadsheets/d/181CZUA-74uh-8yLJO_iI5aMtaBYMl4p2IdnOOg38Cas/gviz/tq?tqx=out:json&sheet=Pagu";

async function fetchTotalPagu() {
  try {
    const res = await fetch(PAGU_URL);
    const text = await res.text();
    const start = text.indexOf('(');
    const end = text.lastIndexOf(')');
    const json = JSON.parse(text.substring(start + 1, end));
    let total = 0;
    json.table.rows.forEach(r => {
      const pos = r.c && r.c[0] ? r.c[0].v : null;
      const nominal = r.c && r.c[1] ? r.c[1].v : null;
      if (typeof pos === 'string' && !pos.toLowerCase().startsWith('total') && typeof nominal === 'number') {
        total += nominal;
      }
    });
    return total > 0 ? total : 136764793;
  } catch (e) {
    console.error('Failed to fetch Pagu', e);
    return 136764793; // fallback to known total
  }
}

// =======================================================
// BULANAN DATA LOADING & PROCESSING
// =======================================================

// --- PENGELUARAN FOZ ---
let PENGELUARAN_DATA = { paguBulanan: 0, trx: [] };

async function fetchGvizSheet(sheetName) {
  try {
    const res = await fetch(GVIZ_BASE + encodeURIComponent(sheetName));
    const text = await res.text();
    const start = text.indexOf('(');
    const end = text.lastIndexOf(')');
    const json = JSON.parse(text.substring(start + 1, end));
    return json.table.rows;
  } catch(e) {
    return [];
  }
}

async function loadPengeluaranData() {
  const paguRows = await fetchGvizSheet('Pagu');
  PENGELUARAN_DATA.paguTahunan = 0;
  paguRows.forEach(r => {
    const pos = r.c && r.c[0] ? r.c[0].v : null;
    const nominal = r.c && r.c[1] ? r.c[1].v : null;
    if (pos && typeof pos === 'string' && !pos.toLowerCase().startsWith('total')) {
      if (typeof nominal === 'number' && nominal > 0) {
        PENGELUARAN_DATA.paguTahunan += nominal;
      }
    }
  });

  PENGELUARAN_DATA.totalVal = 0;
  PENGELUARAN_DATA.totalCount = 0;
  
  const cellVal = (row, colIdx) => {
    if (!row || !row.c || !row.c[colIdx]) return null;
    return row.c[colIdx].v;
  };

  for (let i = 0; i < DETAIL_SHEETS.length; i += 8) {
    const batch = DETAIL_SHEETS.slice(i, i + 8);
    const results = await Promise.all(batch.map(name => fetchGvizSheet(name)));
    
    results.forEach((rows) => {
      let sheetTotal = 0;
      let sheetCount = 0;
      
      // Look for total in header first
      for (let r = 0; r < Math.min(3, rows.length); r++) {
        const fVal = cellVal(rows[r], 5);
        const hVal = cellVal(rows[r], 7);
        if (fVal && typeof fVal === 'string' && fVal.toLowerCase().includes('total')) {
          if (typeof hVal === 'number') {
            sheetTotal = hVal;
          }
          break;
        }
        if (typeof hVal === 'number' && hVal > 100 && r < 2) {
          sheetTotal = hVal;
        }
      }

      // Count transactions
      for (let r = 0; r < rows.length; r++) {
        const noVal = cellVal(rows[r], 0);
        if (noVal !== null && typeof noVal === 'number') {
          sheetCount++;
        }
      }

      // Fallback summation if total not found in header
      if (sheetTotal === 0) {
        rows.forEach(row => {
          const noVal = cellVal(row, 0);
          const hVal = cellVal(row, 7);
          if (noVal !== null && typeof noVal === 'number' && typeof hVal === 'number') {
            sheetTotal += hVal;
          }
        });
      }
      
      PENGELUARAN_DATA.totalVal += sheetTotal;
      PENGELUARAN_DATA.totalCount += sheetCount;
    });
  }
}

function updatePengeluaranKPI() {
  const data = PENGELUARAN_DATA;
  if (!data || data.totalCount === undefined) return;

  document.getElementById('kpi-total-pengeluaran').textContent = formatRp(data.totalVal);
  document.getElementById('kpi-pagu').textContent = formatRp(data.paguTahunan);
  document.getElementById('kpi-transaksi-out').textContent = data.totalCount;
  
  const paguTahunan = data.paguTahunan;
  const persen = paguTahunan > 0 ? ((data.totalVal / paguTahunan) * 100).toFixed(1) : 0;
  document.getElementById('kpi-persen').textContent = persen + '%';
}


// --- PENDAPATAN IURAN ---
let PENDAPATAN_DATA = [];

function parseCSVLine(line) {
  let row = [];
  let currentStr = "";
  let inQuotes = false;
  for (let c = 0; c < line.length; c++) {
    const char = line[c];
    if (char === '"' && line[c+1] === '"') {
      currentStr += '"'; c++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(currentStr); currentStr = "";
    } else {
      currentStr += char;
    }
  }
  row.push(currentStr);
  return row;
}

function parseRpValue(str) {
  if (!str || str.trim() === '-' || str.trim() === '') return 0;
  return parseFloat(str.replace(/"/g, '').replace(/[Rp\s\.]/g, '').replace(/,/g, '.').trim()) || 0;
}

function parseTransactionMonth(val) {
  if (!val || val === '-') return -1;
  const lower = val.toLowerCase();
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    if (lower.includes(`/${mm}/`) || lower.includes(`-${mm}-`)) {
      return m - 1; 
    }
  }
  return -1;
}

async function loadPendapatanData() {
  const [resKes, resIuran] = await Promise.all([
    fetch(URL_KESEPAKATAN).then(res => res.text()),
    fetch(URL_IURAN).then(res => res.text())
  ]);

  const kesData = resKes.split('\n').map(parseCSVLine).slice(1);
  const iuranData = resIuran.split('\n').map(parseCSVLine).slice(1);

  PENDAPATAN_DATA = [];

  for (let i = 0; i < iuranData.length; i++) {
    const rowIuran = iuranData[i];
    if (!rowIuran[1] || rowIuran[1].trim() === '') continue; 

    const nama = rowIuran[1].trim();
    const rowKes = kesData.find(r => r[1] && r[1].trim() === nama);
    const iuranBulan = rowKes && rowKes[3] ? parseRpValue(rowKes[3]) : 0;

    const monthlyStatus = [];
    for (let m = 0; m < 12; m++) {
      const statusStr = rowIuran[3 + m] ? rowIuran[3 + m].trim() : '';
      let status = 'belum'; 
      if (statusStr === '-') {
        status = 'na';
      } else if (statusStr !== '') {
        status = 'lunas'; 
      }
      monthlyStatus.push({
        status: status,
        trxMonth: parseTransactionMonth(statusStr)
      });
    }

    PENDAPATAN_DATA.push({ nama, iuranBulan, monthlyStatus });
  }
}

function updatePendapatanKPI(selectedMonth = 'total') {
    let lembagaCount = 0;
    let totalTransaksi = 0;
    let totalNominal = 0;
    let totalAktif = 0;

    PENDAPATAN_DATA.forEach(m => {
      let isWajibAtAll = false;
      let memberTransaksiBulanIni = 0;

      m.monthlyStatus.forEach(st => {
        if (st.status !== 'na') isWajibAtAll = true;
        if (st.status === 'lunas') {
          if (selectedMonth === 'total' || st.trxMonth === parseInt(selectedMonth)) {
            memberTransaksiBulanIni++;
          }
        }
      });

      if (isWajibAtAll) totalAktif++;
      if (memberTransaksiBulanIni > 0) {
        lembagaCount++;
        totalTransaksi += memberTransaksiBulanIni;
        totalNominal += (m.iuranBulan * memberTransaksiBulanIni);
      }
    });

    const persen = totalAktif > 0 ? (lembagaCount / totalAktif * 100).toFixed(1) : 0;

    document.getElementById('kpi-lembaga-in').textContent = lembagaCount;
    document.getElementById('kpi-transaksi-in').textContent = totalTransaksi + ' bln';
    document.getElementById('kpi-partisipasi-in').textContent = persen + '%';
    document.getElementById('kpi-pemasukan-in').textContent = formatRp(totalNominal);
}

// =======================================================


// ---- Utility ----
function formatRp(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const str = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(abs);
  return (v < 0 ? "-Rp " : "Rp ") + str;
}

function pctChange(newer, older) {
  if (!older || older === 0) return null;
  return ((newer - older) / Math.abs(older)) * 100;
}

function renderChange(val, prevVal, elId) {
  const el = document.getElementById(elId);
  if (!el || prevVal === null || prevVal === undefined || isNaN(prevVal)) return;
  const pct = pctChange(val, prevVal);
  if (pct === null) return;
  const dir   = pct >= 0 ? 'up' : 'down';
  const icon  = pct >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
  const absPct = Math.abs(pct).toFixed(1);
  const prevDate = DATES[activeDateIdx - 1] || "sebelumnya";
  el.innerHTML = `<span class="${dir}"><i class="fas ${icon}"></i> ${absPct}%</span>&nbsp;vs ${prevDate}`;
}

function getVal(keterangan, dateIdx) {
  const ket = keterangan.trim().toUpperCase();
  const row = ITEMS.find(item => item.keterangan.trim().toUpperCase() === ket);
  if (!row) return null;
  return row.values[dateIdx] ?? null;
}

// ---- Structure map (row index → category & section) ----
// We parse by the "No" column to identify headers/groups
function categorizeItems() {
  // Section 1: Posisi Kas
  //   Group "bank"     → "Kas di Bank" (No=1) + sub items until "Total Kas di Bank"
  //   Group "titipan"  → "Dana Titipan" (No=2) + sub items until "Total Dana Titipan"
  //   Group "foz"      → "Kas FOZ" (No=3) + sub items
  //   Group "piutang"  → "Piutang" (No=4) + sub items
  //   Summary "netto"  → "Saldo Net FOZ setelah Piutang" (No=5)
  // Section 2: Pencairan
  //   starts at "Pencairan Operasional, Program dan Kepegawaian"

  const GROUPS = {
    bank:     { header: 'Kas di Bank',     total: 'Total Kas di Bank',    section: 'posisi' },
    titipan:  { header: 'Dana Titipan',    total: 'Total Dana Titipan',   section: 'posisi' },
    foz:      { header: 'Kas FOZ',         total: null,                   section: 'posisi' },
    piutang:  { header: 'Piutang',         total: 'Total Piutang',        section: 'posisi' },
  };

  let currentGroup   = null;
  let inPencairan    = false;

  return ITEMS.map(item => {
    const ket = item.keterangan.trim();
    const ketUpper = ket.toUpperCase();

    // Detect section: Pencairan
    if (ketUpper.includes('PENCAIRAN OPERASIONAL, PROGRAM')) {
      inPencairan = true;
    }

    // Detect group headers
    for (const [gKey, gDef] of Object.entries(GROUPS)) {
      if (ket === gDef.header) {
        currentGroup = gKey;
        return { ...item, group: gKey, isGroupHeader: true, isTotal: false, section: inPencairan ? 'pencairan' : 'posisi' };
      }
    }

    // Detect "Saldo Net FOZ setelah Piutang" — summary row for section
    if (ketUpper.includes('SALDO NET FOZ SETELAH PIUTANG')) {
      return { ...item, group: 'netto', isGroupHeader: false, isTotal: true, section: inPencairan ? 'pencairan' : 'posisi' };
    }

    // Detect "Saldo Net FOZ setelah Pencairan"
    if (ketUpper.includes('SALDO NET FOZ SETELAH PENCAIRAN')) {
      return { ...item, group: 'netto-pencairan', isGroupHeader: false, isTotal: true, section: 'pencairan' };
    }

    // Detect Total rows
    const isTotal = ketUpper.startsWith('TOTAL') || ketUpper.includes('SALDO NET FOZ') || ketUpper.includes('SALDO DANA TITIPAN');

    return {
      ...item,
      group: currentGroup,
      isGroupHeader: false,
      isTotal,
      section: inPencairan ? 'pencairan' : 'posisi'
    };
  });
}

// ---- Render ----
function updateKPIs() {
  const idx  = activeDateIdx;
  const prev = idx > 0 ? idx - 1 : null;

  // 1. Kas di Bank
  const bank = getVal('Total Kas di Bank', idx);
  document.getElementById('kpi-bank').textContent = formatRp(bank);
  if (prev !== null) renderChange(bank, getVal('Total Kas di Bank', prev), 'kpi-bank-sub');

  // 2. Dana Titipan — nilai negatif karena kewajiban
  const titipan = getVal('Total Dana Titipan', idx);
  document.getElementById('kpi-titipan').textContent = formatRp(titipan);
  if (prev !== null) renderChange(titipan, getVal('Total Dana Titipan', prev), 'kpi-titipan-sub');

  // 3. Saldo Net FOZ (before piutang)
  const foz = getVal('Saldo Net FOZ', idx);
  document.getElementById('kpi-foz').textContent = formatRp(foz);
  if (prev !== null) renderChange(foz, getVal('Saldo Net FOZ', prev), 'kpi-foz-sub');

  // 4. Piutang
  const piutang = getVal('Total Piutang', idx);
  document.getElementById('kpi-piutang').textContent = formatRp(piutang);
  if (prev !== null) renderChange(piutang, getVal('Total Piutang', prev), 'kpi-piutang-sub');

  // 5. Saldo Net + Piutang
  const netto = getVal('Saldo Net FOZ setelah Piutang', idx);
  document.getElementById('kpi-netto').textContent = formatRp(netto);
  if (prev !== null) renderChange(netto, getVal('Saldo Net FOZ setelah Piutang', prev), 'kpi-netto-sub');

  // 6. Financial Health Rate
  if (totalPaguOps > 0 && foz !== null) {
    const healthMonths = parseFloat((foz / totalPaguOps).toFixed(1));
    document.getElementById('kpi-health').textContent = healthMonths + " Bulan";
    const statusText = healthMonths >= 4 ? "Sehat" : "Tidak Sehat";
    const statusColor = healthMonths >= 4 ? "var(--green)" : "var(--red)";
    document.getElementById('kpi-health-sub').innerHTML = `Rasio Net FOZ : Pagu Ops <br/><span style="margin-top:4px; display:inline-block; font-weight:600; color:${statusColor}">${statusText}</span>`;
  }
}

function renderTrenChart() {
  const ctx = document.getElementById('chart-tren');
  if (!ctx) return;
  if (chartTren) { chartTren.destroy(); chartTren = null; }

  const fozData     = DATES.map((_, i) => getVal('Saldo Net FOZ', i) || 0);
  const nettoData   = DATES.map((_, i) => getVal('Saldo Net FOZ setelah Piutang', i) || 0);

  chartTren = new Chart(ctx, {
    type: 'line',
    data: {
      labels: DATES,
      datasets: [
        {
          label: 'Saldo Net FOZ',
          data: fozData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          fill: true, tension: 0.4, borderWidth: 2.5,
          pointBackgroundColor: '#10b981', pointRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => formatRp(ctx.raw)
          }
        }
      },
      scales: {
        y: {
          ticks: { callback: v => 'Rp ' + (v/1e9).toFixed(1) + 'M', font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.04)' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderKompChart() {
  const ctx = document.getElementById('chart-komp');
  if (!ctx) return;
  if (chartKomp) { chartKomp.destroy(); chartKomp = null; }

  const CategorizedItems = categorizeItems();
  let labels = [], values = [], titleText = '';

  if (!activeCard || activeCard === 'bank') {
    // Komposisi Kas di Bank
    titleText = 'Komposisi Kas di Bank';
    CategorizedItems.forEach(item => {
      if (item.group === 'bank' && !item.isGroupHeader && !item.isTotal) {
        const v = item.values[activeDateIdx] || 0;
        if (v > 0) { labels.push(item.keterangan.split(' - ')[0].trim().replace('Bank Syariah Indonesia (FOZ)', 'BSI (FOZ)').replace('Bank Rakyat Indonesia (FOZ)', 'BRI (FOZ)')); values.push(v); }
      }
    });
  } else if (activeCard === 'foz') {
    // Komponen Kas FOZ
    titleText = 'Komponen Kas FOZ';
    CategorizedItems.forEach(item => {
      if (item.group === 'foz' && !item.isGroupHeader && !item.isTotal) {
        const v = item.values[activeDateIdx] || 0;
        if (v > 0) { labels.push(item.keterangan); values.push(v); }
      }
    });
  } else if (activeCard === 'piutang') {
    titleText = 'Rincian Piutang';
    CategorizedItems.forEach(item => {
      if (item.group === 'piutang' && !item.isGroupHeader && !item.isTotal) {
        const v = item.values[activeDateIdx] || 0;
        if (v > 0) { labels.push(item.keterangan); values.push(v); }
      }
    });
  } else if (activeCard === 'titipan') {
    titleText = 'Top Dana Titipan';
    const sub = [];
    CategorizedItems.forEach(item => {
      if (item.group === 'titipan' && !item.isGroupHeader && !item.isTotal) {
        const v = Math.abs(item.values[activeDateIdx] || 0);
        if (v > 0) sub.push({ label: item.keterangan, v });
      }
    });
    sub.sort((a, b) => b.v - a.v).slice(0, 5).forEach(x => { labels.push(x.label.replace('Dana Titipan ', '')); values.push(x.v); });
  }

  document.getElementById('chart-komp-title').textContent = titleText;

  chartKomp = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
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

function renderTable() {
  const CategorizedItems = categorizeItems();
  const thead = document.getElementById('detail-thead');
  const tbody = document.getElementById('detail-tbody');
  const note  = document.getElementById('detail-note');
  const badge = document.getElementById('detail-panel-badge');
  const title = document.getElementById('detail-panel-title');

  // Determine filter
  let filteredItems = [];
  let sectionItems = CategorizedItems.filter(item => item.section === activeTab);

  if (activeCard) {
    filteredItems = sectionItems.filter(item => item.group === activeCard);
    const names = { bank: 'Kas di Bank', titipan: 'Dana Titipan', foz: 'Kas FOZ', piutang: 'Piutang' };
    title.textContent = 'Rincian: ' + (names[activeCard] || activeCard);
    badge.textContent = names[activeCard] || activeCard;
  } else {
    filteredItems = sectionItems;
    title.textContent = activeTab === 'posisi' ? 'Posisi Kas Lengkap' : 'Rincian Setelah Pencairan';
    badge.textContent = 'Semua Pos';
  }

  // Warning for Dana Titipan
  if (activeCard === 'titipan') {
    note.innerHTML = `<div class="info-note"><i class="fas fa-info-circle"></i> Dana Titipan adalah <strong>kewajiban</strong> FOZ kepada pihak ketiga (seperti mitra dan program eksternal). Ditampilkan sebagai angka negatif karena merupakan pengurang dari total kas.</div>`;
  } else {
    note.innerHTML = '';
  }

  // Table header
  thead.innerHTML = `
    <tr>
      <th style="width:60%;">Keterangan</th>
      <th style="text-align: right; padding-right: 20px;">Nilai (${DATES[activeDateIdx]})</th>
    </tr>
  `;

  // Table rows
  let html = '';
  filteredItems.forEach(item => {
    const ket = item.keterangan.trim();
    if (!ket || ket === ' ') return;

    // Skip redundant group total rows
    const upperKet = ket.toUpperCase();
    if (upperKet === "TOTAL KAS DI BANK" || 
        upperKet === "TOTAL DANA TITIPAN" || 
        upperKet === "TOTAL DANA TITIPAN FOZ" || 
        upperKet === "TOTAL PIUTANG") {
        return;
    }

    const val = item.values[activeDateIdx];
    const displayVal = (val !== null && val !== undefined && !isNaN(val)) ? val : null;
    const isNeg = displayVal !== null && displayVal < 0;

    let rowClass = '';
    let tdName   = `padding: 11px 20px; font-size: 0.88rem;`;
    let tdVal    = `padding: 11px 20px; font-size: 0.88rem; text-align: right;`;

    if (item.isGroupHeader) {
      rowClass = 'is-group-header';
      tdName  += ' font-weight: 700; font-size: 0.9rem;';
    } else if (item.isTotal) {
      rowClass = 'is-total';
      tdName  += ' font-weight: 700;';
      tdVal   += ' font-weight: 700;';
    }

    if (isNeg) tdVal += ' color: var(--red);';
    else if (displayVal > 0 && item.isTotal) tdVal += ' color: var(--green);';

    let displayCellVal = '—';
    if (item.isGroupHeader) {
      // Ambil nilai total kategori untuk ditampilkan di header
      let totalVal = 0;
      if (ket === "Kas di Bank") {
        totalVal = getVal('Total Kas di Bank', activeDateIdx);
      } else if (ket === "Dana Titipan") {
        totalVal = getVal('Total Dana Titipan FOZ', activeDateIdx) || getVal('Total Dana Titipan', activeDateIdx);
      } else if (ket === "Kas FOZ") {
        totalVal = getVal('Saldo Net FOZ', activeDateIdx);
      } else if (ket === "Piutang") {
        totalVal = getVal('Total Piutang', activeDateIdx);
      }
      displayCellVal = totalVal !== null ? formatRp(totalVal) : '—';
      tdVal += ' font-weight: 700; color: var(--green);'; // Buat angka di header berwarna hijau tebal
      if (totalVal < 0) {
        tdVal = tdVal.replace('var(--green)', 'var(--red)'); // Merah jika negatif
      }
    } else {
      displayCellVal = displayVal !== null ? formatRp(displayVal) : '—';
    }

    html += `
      <tr class="${rowClass}">
        <td style="${tdName}">${ket}</td>
        <td style="${tdVal}">${displayCellVal}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html || `<tr><td colspan="2" class="empty-state">Tidak ada data untuk ditampilkan.</td></tr>`;
}

// ---- Event Handlers (Global) ----
window.filterCard = function(card) {
  if (activeCard === card) {
    activeCard = null;
    document.querySelectorAll('.kpi-card').forEach(el => el.classList.remove('active'));
  } else {
    activeCard = card;
    document.querySelectorAll('.kpi-card').forEach(el => el.classList.remove('active'));
    document.getElementById('card-' + card)?.classList.add('active');
  }
  renderKompChart();
  renderTable();
};

window.switchTab = function(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  renderTable();
};

// ---- Data Fetching & Parsing ----
async function fetchCSVData() {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error('Network error');
  const text = await res.text();

  const lines = text.split('\n');
  const dates = [];
  const items = [];

  const header = lines[0].split(',');
  for(let i = 2; i < header.length; i++) {
    dates.push(header[i].replace(/"/g, '').trim());
  }

  for(let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    let row = [];
    let currentStr = "";
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' && line[c+1] === '"') {
        currentStr += '"'; c++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentStr); currentStr = "";
      } else {
        currentStr += char;
      }
    }
    row.push(currentStr);
    
    const keterangan = row[1] ? row[1].replace(/"/g, '').trim() : '';
    if (!keterangan) continue;
    
    const values = [];
    for(let j = 2; j < row.length; j++) {
      let valStr = row[j].replace(/"/g, '').replace(/[Rp\s\.]/g, '').replace(/,/g, '.').trim();
      let num = parseFloat(valStr);
      values.push(isNaN(num) ? null : num);
    }
    
    items.push({
      no: row[0] ? row[0].replace(/"/g, '').trim() : '',
      keterangan: keterangan,
      values: values
    });
  }

  return { dates, items };
}

// ---- Init ----
async function initDashboard() {
  const loadingState = document.getElementById('loading-state');
  const dashboardContent = document.getElementById('dashboard-content');
  if (loadingState) {
    loadingState.style.display = 'block';
    loadingState.innerHTML = `
      <i class="fas fa-circle-notch fa-spin" style="font-size:2rem; color:var(--green);"></i>
      <p style="margin-top:12px;">Mengambil data dari Google Sheets...</p>
    `;
  }
  if (dashboardContent) dashboardContent.style.display = 'none';

  try {
    const [csvData, paguData] = await Promise.all([
        fetchCSVData(), 
        fetchTotalPagu(),
        loadPengeluaranData(),
        loadPendapatanData()
    ]);
    ALL_DATA = csvData;
    DATES    = ALL_DATA.dates;
    ITEMS    = ALL_DATA.items;
    totalPaguOps = paguData;
    activeDateIdx = DATES.length - 1;

    // Populate date dropdown
    const sel = document.getElementById('date-select');
    if (sel) {
      sel.innerHTML = DATES.map((d, i) => `<option value="${i}"${i === activeDateIdx ? ' selected' : ''}>${d}</option>`).join('');
      
      // Re-create node to clear old listeners
      const newSel = sel.cloneNode(true);
      sel.parentNode.replaceChild(newSel, sel);
      newSel.addEventListener('change', () => {
        activeDateIdx = parseInt(newSel.value);
        updateKPIs();
        renderTrenChart();
        renderKompChart();
        renderTable();
      });
    }

    // Populate Pendapatan month select
    const pendMonthSelect = document.getElementById('pendapatan-month-select');
    if (pendMonthSelect) {
      const monthOptions = MONTH_NAMES.map((m, i) => `<option value="${i}">${m}</option>`).join('');
      pendMonthSelect.innerHTML += monthOptions;
      
      pendMonthSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const subTitle = document.getElementById('pendapatan-title-sub');
        if (subTitle) {
           subTitle.textContent = val === 'total' ? '(Arus Kas Total)' : `(Arus Kas ${MONTH_NAMES[parseInt(val)]})`;
        }
        updatePendapatanKPI(val);
      });
    }

    // Render initial data without month filter
    updatePengeluaranKPI();
    updatePendapatanKPI('total');

    if (loadingState) loadingState.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';

    updateKPIs();
    renderTrenChart();
    renderKompChart();
    renderTable();

  } catch (err) {
    if (loadingState) {
      loadingState.innerHTML = `
        <i class="fas fa-exclamation-circle" style="font-size:2rem; color:var(--red);"></i>
        <p style="margin-top:12px; color:var(--red);">Gagal mengambil data. Pastikan koneksi internet aktif dan link Publish to Web valid.</p>
      `;
    }
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);
window.pjaxInitDashboard = initDashboard;
})();

