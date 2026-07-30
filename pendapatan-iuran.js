(function() {

// ===================================================
// pendapatan-iuran.js — Live Data dari Google Sheets Publish to Web (CSV)
// ===================================================

const URL_KESEPAKATAN = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTaZXQznuc6ZSa-DKRcOsXH-UfmyvQsAp0TN4DYFC7a72ihr-Il6nAYnu7HlnzVx9nlXvPtUrKiOoBv/pub?output=csv&single=true&gid=71422965";
const URL_IURAN = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTaZXQznuc6ZSa-DKRcOsXH-UfmyvQsAp0TN4DYFC7a72ihr-Il6nAYnu7HlnzVx9nlXvPtUrKiOoBv/pub?output=csv&single=true&gid=885646170";

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

let membersData = []; // Gabungan Kesepakatan & Iuran
let activeMonthIdx = 'all'; // 'all' or 0-11
let activeTab = 'pemasukan'; // 'pemasukan' | 'kepatuhan'
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

function parseTransactionMonth(dateStr) {
  if (!dateStr || dateStr === '-') return -1;
  // expects format dd/mm/yy
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const m = parseInt(parts[1], 10);
    if (!isNaN(m) && m >= 1 && m <= 12) {
      return m - 1; // 0-indexed month
    }
  }
  return -1;
}

// ---- Data Fetching ----
async function fetchAllData() {
  const [resKes, resIuran] = await Promise.all([
    fetch(URL_KESEPAKATAN).then(res => res.text()),
    fetch(URL_IURAN).then(res => res.text())
  ]);

  const csvKes = parseCSV(resKes);
  const csvIuran = parseCSV(resIuran);

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
    const iuranSeharusnyaStr = rowKes && rowKes[8] ? rowKes[8] : '0';
    
    let iuranBulan = parseRp(iuranBulanStr);
    const iuranSeharusnyaBase = parseRp(iuranSeharusnyaStr);
    
    // Fallback if Iuran/Bulan was wrongly typed (like "Anwar")
    if (iuranBulan === 0 && iuranSeharusnyaBase > 0) {
      iuranBulan = iuranSeharusnyaBase;
    }

    const monthlyStatus = [];
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
        status: status,
        trxMonth: parseTransactionMonth(statusStr)
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
  activeMonthIdx = 'all';
}

// ---- Tab Switching ----
window.switchTab = function(tabId) {
  activeTab = tabId;
  
  // Update UI styles
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.style.color = 'var(--text-muted)';
    btn.style.borderBottomColor = 'transparent';
    btn.classList.remove('active');
  });
  
  const activeBtn = document.getElementById('tab-' + tabId);
  activeBtn.style.color = 'var(--green)';
  activeBtn.style.borderBottomColor = 'var(--green)';
  activeBtn.classList.add('active');
  
  // Update Table headers and labels based on mode
  if (activeTab === 'pemasukan') {
    document.getElementById('kpi1-label').textContent = 'Lembaga Membayar';
    document.getElementById('kpi1-sub').textContent = 'Melakukan transaksi bulan ini';
    document.getElementById('kpi3-label').textContent = 'Tingkat Partisipasi';
    document.getElementById('kpi3-sub').textContent = 'Persentase lembaga aktif';
    document.getElementById('kpi4-label').textContent = 'Pemasukan Riil';
    document.getElementById('kpi4-sub').textContent = 'Uang kas masuk (Cash-basis)';
  } else {
    document.getElementById('kpi1-label').textContent = 'Anggota Wajib Bayar';
    document.getElementById('kpi1-sub').textContent = 'Lembaga aktif di bulan ini';
    document.getElementById('kpi3-label').textContent = 'Tingkat Kepatuhan';
    document.getElementById('kpi3-sub').textContent = 'Rasio lunas terhadap wajib bayar';
    document.getElementById('kpi4-label').textContent = 'Nominal Terkumpul';
    document.getElementById('kpi4-sub').textContent = 'Berdasarkan bulan kewajiban';
  }
  
  const tblContainer = document.querySelector('.table-container');
  if (tblContainer) {
    if (activeTab === 'pemasukan') {
      tblContainer.style.display = 'none';
    } else {
      tblContainer.style.display = 'block';
    }
  }

  updateDashboard();
};

window.filterMonth = function(val) {
  activeMonthIdx = val;
  document.querySelectorAll('.filter-btn-month').forEach(btn => {
    btn.classList.remove('active');
  });
  const id = val === 'all' ? 'btn-month-all' : `btn-month-${val}`;
  const activeBtn = document.getElementById(id);
  if (activeBtn) activeBtn.classList.add('active');
  updateDashboard();
};

// ---- UI Updates ----
function updateDashboard() {
  updateKPIs();
  renderTable();
  renderTrenChart(); // Chart labels/title change based on mode
}

function updateKPIs() {
  if (activeTab === 'pemasukan') {
    let lembagaCount = 0;
    let totalTransaksi = 0;
    let totalNominal = 0;
    let totalAktif = 0;

    membersData.forEach(m => {
      let isWajibAtAll = false;
      let memberTransaksiBulanIni = 0;

      m.monthlyStatus.forEach(st => {
        if (st.status !== 'na') isWajibAtAll = true;
        if (activeMonthIdx === 'all') {
          if (st.status === 'lunas') {
            memberTransaksiBulanIni++;
          }
        } else {
          if (st.trxMonth === activeMonthIdx) {
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

    document.getElementById('kpi1-value').textContent = lembagaCount;
    document.getElementById('kpi3-value').textContent = persen + '%';
    document.getElementById('kpi4-value').textContent = formatRp(totalNominal);

  } else {
    let wajib = 0;
    let lunas = 0;
    let nominal = 0;
    let potensi = 0;

    membersData.forEach(m => {
      if (activeMonthIdx === 'all') {
        m.monthlyStatus.forEach(st => {
          if (st.status !== 'na') {
            wajib++;
            potensi += m.iuranBulan;
            if (st.status === 'lunas') {
              lunas++;
              nominal += m.iuranBulan;
            }
          }
        });
      } else {
        const st = m.monthlyStatus[activeMonthIdx];
        if (st.status !== 'na') {
          wajib++;
          potensi += m.iuranBulan;
          if (st.status === 'lunas') {
            lunas++;
            nominal += m.iuranBulan;
          }
        }
      }
    });

    const persen = wajib > 0 ? (lunas / wajib * 100).toFixed(1) : 0;

    document.getElementById('kpi1-value').textContent = wajib;
    document.getElementById('kpi3-value').textContent = persen + '%';
    document.getElementById('kpi4-value').textContent = formatRp(nominal);
    document.getElementById('kpi4-sub').textContent = 'Potensi: ' + formatRp(potensi);
  }
}

function renderTable() {
  const tbody = document.querySelector('#rincian-table tbody');
  const searchQ = document.getElementById('search-input').value.toLowerCase();
  const filterSt = document.getElementById('status-filter').value;

  tbody.innerHTML = '';
  
  let no = 1;
  membersData.forEach(m => {
    if (searchQ && !m.nama.toLowerCase().includes(searchQ)) return;
    
    let badgeClass = '';
    let badgeText = '';

    let wajibCount = 0;
    let actualTrxCount = 0;

    if (activeMonthIdx === 'all') {
      m.monthlyStatus.forEach(st => {
        if (st.status !== 'na') wajibCount++;
        if (st.status === 'lunas') actualTrxCount++;
      });
    } else {
      if (m.monthlyStatus[activeMonthIdx].status !== 'na') wajibCount = 1;
      if (activeTab === 'pemasukan') {
        m.monthlyStatus.forEach(st => {
          if (st.trxMonth === activeMonthIdx) actualTrxCount++;
        });
      } else {
        if (m.monthlyStatus[activeMonthIdx].status === 'lunas') actualTrxCount = 1;
      }
    }

    let iuranSeharusnya = wajibCount * m.iuranBulan;
    let iuranAktual = actualTrxCount * m.iuranBulan;
    
    let kesesuaianBadge = '';
    if (wajibCount === 0) {
      kesesuaianBadge = '-';
    } else if (iuranAktual >= iuranSeharusnya) {
      kesesuaianBadge = '<i class="fas fa-check-circle" style="color: #10b981; font-size: 1.2rem;"></i>';
    } else {
      kesesuaianBadge = '<i class="fas fa-times-circle" style="color: #ef4444; font-size: 1.2rem;"></i>';
    }

    if (activeTab === 'pemasukan') {
      let dates = [];
      let trxs = 0;
      m.monthlyStatus.forEach(st => {
        if (activeMonthIdx === 'all') {
          if (st.status === 'lunas') {
            trxs++;
            if (!dates.includes(st.raw)) dates.push(st.raw);
          }
        } else {
          if (st.trxMonth === activeMonthIdx) {
            trxs++;
            if (!dates.includes(st.raw)) dates.push(st.raw);
          }
        }
      });
      
      if (filterSt === 'lunas' && trxs === 0) return;
      if (filterSt === 'belum' && trxs > 0) return;
      if (filterSt === 'na') {
        if (activeMonthIdx === 'all') {
          const allNa = m.monthlyStatus.every(s => s.status === 'na');
          if (!allNa) return;
        } else {
          const isNa = m.monthlyStatus[activeMonthIdx].status === 'na';
          if (!isNa) return;
        }
      }
      
      if (trxs > 0) {
        badgeClass = 'lunas';
        badgeText = `<i class="fas fa-check"></i> ${trxs} Trx (${dates.slice(0,2).join(', ')}${dates.length > 2 ? ', dst' : ''})`;
      } else {
        let isNa = false;
        if (activeMonthIdx === 'all') {
          isNa = m.monthlyStatus.every(s => s.status === 'na');
        } else {
          isNa = m.monthlyStatus[activeMonthIdx].status === 'na';
        }

        if (isNa) {
          badgeClass = 'na';
          badgeText = '-';
        } else {
          badgeClass = 'belum';
          badgeText = 'Tidak ada transaksi';
        }
      }
    } else {
      if (activeMonthIdx === 'all') {
        let w = 0, l = 0;
        m.monthlyStatus.forEach(st => {
          if (st.status !== 'na') w++;
          if (st.status === 'lunas') l++;
        });
        
        if (filterSt === 'lunas' && l < w) return;
        if (filterSt === 'belum' && l > 0) return;
        if (filterSt === 'na' && w > 0) return;

        if (w === 0) {
          badgeClass = 'na';
          badgeText = '-';
        } else if (l === w) {
          badgeClass = 'lunas';
          badgeText = `<i class="fas fa-check"></i> Lunas Penuh (${l}/${w})`;
        } else if (l > 0) {
          badgeClass = 'belum';
          badgeText = `<i class="fas fa-exclamation-triangle"></i> Sebagian (${l}/${w})`;
        } else {
          badgeClass = 'belum';
          badgeText = '<i class="fas fa-times"></i> Belum Bayar';
        }
      } else {
        const st = m.monthlyStatus[activeMonthIdx];
        if (filterSt !== 'all' && st.status !== filterSt) return;

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
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${no++}</td>
      <td style="font-weight:500;">${m.nama}</td>
      <td>${m.skala}</td>
      <td>${formatRp(m.iuranBulan)}</td>
      <td style="font-weight:600;">${formatRp(iuranSeharusnya)}</td>
      <td style="text-align:center;">${kesesuaianBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTrenChart() {
  const ctx = document.getElementById('chart-tren');
  if (!ctx) return;
  if (chartTren) { chartTren.destroy(); chartTren = null; }

  const nominalTerkumpul = [];
  const persentase = [];
  
  if (activeTab === 'pemasukan') {
    for (let m = 0; m < 12; m++) {
      let nom = 0;
      let totalAktif = 0;
      let lembagaCount = 0;
      
      membersData.forEach(mem => {
        let isWajibAtAll = false;
        let memberTransaksiBulanIni = 0;
        
        mem.monthlyStatus.forEach(st => {
          if (st.status !== 'na') isWajibAtAll = true;
          if (st.trxMonth === m) memberTransaksiBulanIni++;
        });
        
        if (isWajibAtAll) totalAktif++;
        if (memberTransaksiBulanIni > 0) {
          lembagaCount++;
          nom += (mem.iuranBulan * memberTransaksiBulanIni);
        }
      });
      
      nominalTerkumpul.push(nom);
      persentase.push(totalAktif > 0 ? (lembagaCount / totalAktif * 100) : 0);
    }
  } else {
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
      persentase.push(w > 0 ? (l / w * 100) : 0);
    }
  }

  chartTren = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: 'Nominal (Rp)',
          data: nominalTerkumpul,
          backgroundColor: '#8b5cf6',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: activeTab === 'pemasukan' ? 'Tingkat Partisipasi (%)' : 'Tingkat Kepatuhan (%)',
          data: persentase,
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

    // Build month pill filters
    const fBar = document.getElementById('month-filter-bar');
    if (fBar) {
      let html = `<button class="filter-btn active filter-btn-month" id="btn-month-all" onclick="window.filterMonth('all')">Semua</button>`;
      MONTHS.forEach((m, i) => {
        html += `<button class="filter-btn filter-btn-month" id="btn-month-${i}" onclick="window.filterMonth(${i})">${m}</button>`;
      });
      fBar.innerHTML = html;
    }

    // Attach filter listeners
    document.getElementById('search-input')?.addEventListener('input', renderTable);
    const sel = document.getElementById('status-filter');
    if (sel) {
      sel.addEventListener('change', (e) => {
        filterSt = e.target.value;
        renderTable();
      });
    }

    const tblContainer = document.querySelector('.table-container');
    if (tblContainer && activeTab === 'pemasukan') {
      tblContainer.style.display = 'none';
    }

    updateDashboard();

    if (loadingState) loadingState.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';

    // Set default tab explicitly
    window.switchTab('pemasukan');

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
window.pjaxInitDashboard = initDashboard;
})();

