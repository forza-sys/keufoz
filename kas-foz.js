const KAS_FOZ_API = 'https://script.google.com/macros/s/AKfycbzaAyD3NkhbM1uQCcTJcH5vNyo5lAow74LI9Vg8vztYiUXT5-bmwA19I8ylYThA71SA/exec';

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

function formatRp(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const str = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(abs);
  return (v < 0 ? "-Rp " : "Rp ") + str;
}

async function init() {
  const loadingState = document.getElementById('loading-state');
  const dashboardContent = document.getElementById('dashboard-content');
  
  if (!KAS_FOZ_API) {
    if (loadingState) {
      loadingState.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="font-size:2rem; color:var(--amber);"></i>
        <p style="margin-top:12px;">API belum dikonfigurasi. Silakan deploy Google Apps Script terlebih dahulu.</p>
      `;
    }
    return;
  }

  try {
    if (loadingState) loadingState.style.display = 'block';
    if (dashboardContent) dashboardContent.style.display = 'none';

    await fetchData();

    if (loadingState) loadingState.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';

    if (ALL_DATA) {
      renderKPIs(ALL_DATA);
      renderHealthTable(ALL_DATA, activeFilter);
      renderCharts(ALL_DATA);
    }
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

async function fetchData() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    const res = await fetch(KAS_FOZ_API, {
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error('Network response was not ok: ' + res.status);
    
    const text = await res.text();
    try {
      ALL_DATA = JSON.parse(text);
    } catch (e) {
      // Google might return an HTML auth page instead of JSON
      throw new Error('API mengembalikan format yang tidak valid. Coba buka di Incognito mode atau pastikan Apps Script terotorisasi.');
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timeout. Coba refresh halaman atau buka di Incognito mode.');
    }
    throw err;
  }
}

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
  document.getElementById('kpi-transaksi').textContent = totalTrans.toLocaleString('id-ID');
  
  const cardPersen = document.getElementById('kpi-card-persen');
  if (cardPersen) {
    cardPersen.className = 'kpi-card';
    if (persen <= 75) cardPersen.classList.add('green');
    else if (persen <= 100) cardPersen.classList.add('amber');
    else cardPersen.classList.add('red');
  }
}

// Build a lookup object from pagu array: { 'Kas Kecil': 5000000, ... }
function buildPaguLookup(paguArray) {
  const lookup = {};
  if (!Array.isArray(paguArray)) return lookup;
  paguArray.forEach(p => { lookup[p.pos] = p.nominal || 0; });
  return lookup;
}

// Find pagu for a sheet by checking PAGU_MAP (reverse: pagu name -> sheet name)
function findPaguForSheet(sheetName, paguLookup) {
  // Check direct match in pagu
  if (paguLookup[sheetName] !== undefined) return paguLookup[sheetName];
  // Check via PAGU_MAP (key=pagu name, value=sheet name)
  for (const [paguName, mappedSheet] of Object.entries(PAGU_MAP)) {
    if (mappedSheet === sheetName && paguLookup[paguName] !== undefined) {
      return paguLookup[paguName];
    }
  }
  return 0;
}

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
      if (persen <= 75) {
        statusBadge = '<span class="badge badge-sehat">🟢 Sehat</span>';
        fillColor = '#10b981';
      } else if (persen <= 100) {
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
    if (a.persen !== null && b.persen !== null) {
      return b.persen - a.persen;
    }
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
        <div style="font-size:0.8rem; font-weight:600; color:var(--text-main)">${r.persen.toFixed(1)}%</div>
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
        <td style="text-align:right; padding-right:15px">${progressHtml}</td>
        <td style="text-align:center">${r.statusBadge}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html || `<tr><td colspan="7" class="empty-state">Tidak ada data.</td></tr>`;
}

function renderCharts(data) {
  if (!data.sheets) return;
  
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
        labels: top10.map(i => i.name.substring(0, 15) + (i.name.length > 15 ? '...' : '')),
        datasets: [
          {
            label: 'Realisasi',
            data: top10.map(i => i.realisasi),
            backgroundColor: '#3b82f6'
          },
          {
            label: 'Pagu',
            data: top10.map(i => i.pagu),
            backgroundColor: '#e5e7eb'
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: ctx => ctx.dataset.label + ': ' + formatRp(ctx.raw)
            }
          }
        }
      }
    });
  }

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

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('hazana:pjax-loaded', init);
