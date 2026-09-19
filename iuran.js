(function() {

// ===================================================
// pendapatan-iuran.js — Live Data dari Google Sheets Publish to Web (CSV)
// ===================================================

const URL_KESEPAKATAN = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTaZXQznuc6ZSa-DKRcOsXH-UfmyvQsAp0TN4DYFC7a72ihr-Il6nAYnu7HlnzVx9nlXvPtUrKiOoBv/pub?output=csv&single=true&gid=71422965";
const URL_IURAN = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTaZXQznuc6ZSa-DKRcOsXH-UfmyvQsAp0TN4DYFC7a72ihr-Il6nAYnu7HlnzVx9nlXvPtUrKiOoBv/pub?output=csv&single=true&gid=885646170";

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

let membersData = []; // Gabungan Kesepakatan & Iuran
let activeMonthIdx = 'all'; // 'all' or 0-11
const activeTab = 'kepatuhan';
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
    const iuranBulanStr = rowKes && rowKes[3] ? rowKes[3] : '0';
    const iuranSeharusnyaStr = rowKes && rowKes[8] ? rowKes[8] : '0';
    const statusKesStr = rowKes && rowKes[9] ? rowKes[9].trim() : '';
    
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
      iuranSeharusnyaBase,
      statusKesStr,
      monthlyStatus
    });
  }

  const d = new Date();
  activeMonthIdx = 'all';
}

// ---- Tab Switching ----

window.filterMonth = function(val) {
  activeMonthIdx = val;
  updateDashboard();
};

// ---- UI Updates ----
function updateDashboard() {
  updateKPIs();
  renderTable();
}

function updateKPIs() {
    let wajib = 0;
    let lunas = 0;
    let belum = 0;
    let masuk = 0;
    let piutang = 0;
    let skalaInv = { 'Nasional': { w: 0, l: 0 }, 'Provinsi': { w: 0, l: 0 }, 'Kab/Kota': { w: 0, l: 0 } };

    membersData.forEach(m => {
      if (activeMonthIdx === 'all') {
        m.monthlyStatus.forEach(st => {
          if (st.status !== 'na') {
            wajib++;
            if (skalaInv[m.skala]) skalaInv[m.skala].w++;
            if (st.status === 'lunas') {
              if (skalaInv[m.skala]) skalaInv[m.skala].l++;
              lunas++;
              masuk += m.iuranBulan;
            } else {
              belum++;
              piutang += m.iuranBulan;
            }
          }
        });
      } else {
        // Lunas and Masuk (Cash Basis): diakui jika trxMonth == activeMonthIdx
        m.monthlyStatus.forEach(st => {
          if (st.status !== 'na') {
            if (st.trxMonth === activeMonthIdx && st.status === 'lunas') {
              if (skalaInv[m.skala]) skalaInv[m.skala].l++;
              lunas++;
              masuk += m.iuranBulan;
            }
          }
        });
        
        // Wajib, Belum, dan Piutang (Accrual Basis)
        const stMonth = m.monthlyStatus[activeMonthIdx];
        if (stMonth.status !== 'na') {
          if (skalaInv[m.skala]) skalaInv[m.skala].w++;
          wajib++;
          if (stMonth.status !== 'lunas') {
            belum++;
            piutang += m.iuranBulan;
          }
        }
      }
    });

    const kpi1 = document.getElementById('kpi1-value');
    if (kpi1) kpi1.textContent = membersData.length;
    document.getElementById('kpi2-value').textContent = formatRp(masuk);
    
    // Card 2: % Kepatuhan Invoice
    const complianceRate = wajib > 0 ? ((lunas / wajib) * 100).toFixed(1) : 0;
    document.getElementById('kpi3-value').textContent = complianceRate + '%';
    const kpi3Sub = document.getElementById('kpi3-sub');
    if (kpi3Sub) {
      let nPct = skalaInv['Nasional'].w > 0 ? ((skalaInv['Nasional'].l / skalaInv['Nasional'].w) * 100).toFixed(1).replace('.', ',') : "0";
      let pPct = skalaInv['Provinsi'].w > 0 ? ((skalaInv['Provinsi'].l / skalaInv['Provinsi'].w) * 100).toFixed(1).replace('.', ',') : "0";
      let kPct = skalaInv['Kab/Kota'].w > 0 ? ((skalaInv['Kab/Kota'].l / skalaInv['Kab/Kota'].w) * 100).toFixed(1).replace('.', ',') : "0";
      kpi3Sub.innerHTML = `<div style="display: flex; gap: 10px; align-items: center; font-size: 0.65rem; color: #6b7280; line-height: 1.3;"><div style="white-space: nowrap;"><strong style="color:#374151;">${lunas}</strong> terbayar<br><strong style="color:#374151;">${belum}</strong> belum</div><div style="width: 1px; height: 24px; background: #e5e7eb;"></div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 6px;"><div>Nas <strong style="color:#374151;">${nPct}%</strong></div><div>Prov <strong style="color:#374151;">${pPct}%</strong></div><div>Kab <strong style="color:#374151;">${kPct}%</strong></div></div></div>`;
    }
    
    // Card 3: Piutang
    document.getElementById('kpi4-value').textContent = formatRp(piutang);

    // Dynamic subtitle for Pemasukan Iuran
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const currentActualMonthIdx = new Date().getMonth();
    let subText = "";
    if (activeMonthIdx === 'all') {
      subText = `Tahun 2026 (Jan - ${monthNamesShort[currentActualMonthIdx]})`;
    } else {
      subText = `Bulan ${MONTHS[activeMonthIdx]} 2026`;
    }
    const kpi2Sub = document.getElementById('kpi2-sub');
    if (kpi2Sub) kpi2Sub.textContent = subText;
    
    // INSIGHT 1: KEPATUHAN PEMBAYARAN OPZ
    const totalOPZ = membersData.length;
    let compliantOPZCount = 0;
    
    if (activeMonthIdx === 'all') {
      compliantOPZCount = membersData.filter(m => m.statusKesStr.toLowerCase().includes('sesuai')).length;
    } else {
      compliantOPZCount = membersData.filter(m => m.monthlyStatus[activeMonthIdx] && m.monthlyStatus[activeMonthIdx].status === 'lunas').length;
    }
    
    const pctCompliant = totalOPZ > 0 ? Math.round((compliantOPZCount / totalOPZ) * 100) : 0;
    const i1v = document.getElementById('insight1-value');
    const i1d = document.getElementById('insight1-desc');
    if (i1v) i1v.textContent = `${pctCompliant}% Sesuai`;
    if (i1d) {
      if (activeMonthIdx === 'all') {
        i1d.innerHTML = `Sebanyak <strong>${compliantOPZCount} OPZ</strong> telah memenuhi kewajiban iuran dengan status Sesuai dari total <strong>${totalOPZ} OPZ</strong> anggota.`;
      } else {
        i1d.innerHTML = `Sebanyak <strong>${compliantOPZCount} OPZ</strong> lunas pada bulan ${MONTHS[activeMonthIdx]} dari total <strong>${totalOPZ} OPZ</strong> anggota.`;
      }
    }

    // INSIGHT 2: TOTAL POTENSI IURAN (AD/ART)
    let potensiIuran = 0;
    membersData.forEach(m => {
      if (activeMonthIdx === 'all') {
        potensiIuran += (m.iuranSeharusnyaBase * 12);
      } else {
        potensiIuran += m.iuranSeharusnyaBase;
      }
    });
    
    const i2v = document.getElementById('insight2-value');
    const i2d = document.getElementById('insight2-desc');
    if (i2v) i2v.textContent = formatRp(potensiIuran);
    if (i2d) i2d.innerHTML = `Estimasi total iuran yang seharusnya terkumpul berdasarkan ketentuan AD/ART FOZ.`;

    // COLLECT SKALA STATS (For Insight 3 & 4)
    let skalaStats = {};
    membersData.forEach(m => {
      if (!skalaStats[m.skala]) skalaStats[m.skala] = { total: 0, patuh: 0, masuk: 0, potensi: 0 };
      skalaStats[m.skala].total++;
      
      let p = 0;
      let ms = 0;
      if (activeMonthIdx === 'all') {
        p = m.iuranSeharusnyaBase * 12;
        m.monthlyStatus.forEach(st => {
          if (st.status === 'lunas') ms += m.iuranBulan;
        });
      } else {
        p = m.iuranSeharusnyaBase;
        m.monthlyStatus.forEach(st => {
          if (st.trxMonth === activeMonthIdx && st.status === 'lunas') ms += m.iuranBulan;
        });
      }
      skalaStats[m.skala].potensi += p;
      skalaStats[m.skala].masuk += ms;

      let isPatuh = false;
      if (activeMonthIdx === 'all') {
        isPatuh = m.statusKesStr.toLowerCase().includes('sesuai');
      } else {
        isPatuh = m.monthlyStatus[activeMonthIdx] && m.monthlyStatus[activeMonthIdx].status === 'lunas';
      }
      if (isPatuh) skalaStats[m.skala].patuh++;
    });

    // INSIGHT 3: % REALISASI IURAN
    const pctRealisasiStr = (potensiIuran > 0 ? ((masuk / potensiIuran) * 100).toFixed(1) : "0").replace('.', ',');
    const i3v = document.getElementById('insight3-value');
    const i3d = document.getElementById('insight3-desc');
    if (i3v) i3v.textContent = `${pctRealisasiStr}% Terkumpul`;
    if (i3d) {
      let nasM = skalaStats['Nasional']?.masuk || 0;
      let nasP = skalaStats['Nasional']?.potensi || 0;
      let provM = skalaStats['Provinsi']?.masuk || 0;
      let provP = skalaStats['Provinsi']?.potensi || 0;
      let kabM = skalaStats['Kab/Kota']?.masuk || 0;
      let kabP = skalaStats['Kab/Kota']?.potensi || 0;
      
      let nasPctR = nasP > 0 ? ((nasM / nasP) * 100).toFixed(1).replace('.', ',') : "0";
      let provPctR = provP > 0 ? ((provM / provP) * 100).toFixed(1).replace('.', ',') : "0";
      let kabPctR = kabP > 0 ? ((kabM / kabP) * 100).toFixed(1).replace('.', ',') : "0";
      
      i3d.innerHTML = `Dari potensi keseluruhan, FOZ merealisasikan <strong>${formatRp(masuk)}</strong> (Cash Basis).<br><span style="display:inline-block; margin-top:4px;">Realisasi: Nasional ${nasPctR}% | Provinsi ${provPctR}% | Kab/Kota ${kabPctR}%</span>`;
    }

    let nas = skalaStats['Nasional'] || { total: 0, patuh: 0 };
    let prov = skalaStats['Provinsi'] || { total: 0, patuh: 0 };
    let kab = skalaStats['Kab/Kota'] || { total: 0, patuh: 0 };
    
    let nasPct = nas.total > 0 ? Math.round((nas.patuh / nas.total) * 100) : 0;
    let provPct = prov.total > 0 ? Math.round((prov.patuh / prov.total) * 100) : 0;
    let kabPct = kab.total > 0 ? Math.round((kab.patuh / kab.total) * 100) : 0;
    
    const i4v = document.getElementById('insight4-value');
    const i4d = document.getElementById('insight4-desc');
    if (i4v) i4v.innerHTML = `Nasional ${nasPct}% <span style="color:#cbd5e1; margin:0 6px;">|</span> Provinsi ${provPct}% <span style="color:#cbd5e1; margin:0 6px;">|</span> Kab/Kota ${kabPct}%`;
    if (i4d) i4d.innerHTML = `Tingkat kepatuhan OPZ skala Nasional mencapai <strong>${nasPct}%</strong>, tingkat kepatuhan skala Provinsi <strong>${provPct}%</strong>, dan skala Kabupaten/Kota <strong>${kabPct}%</strong>.`;
}

function renderTable() {
  const tbody = document.querySelector('#rincian-table tbody');
  const searchQ = document.getElementById('search-input').value.toLowerCase();
  const filterSt = document.getElementById('status-filter').value;
  const filterKes = document.getElementById('kesesuaian-filter')?.value || 'all';

  tbody.innerHTML = '';
  
  let no = 1;
  membersData.forEach(m => {
    if (searchQ && !m.nama.toLowerCase().includes(searchQ)) return;
    
    let kesesuaianBadge = '';
    const statusLower = m.statusKesStr.toLowerCase();
    
    const isSesuai = statusLower.includes('sesuai');
    
    if (filterKes === 'sesuai' && !isSesuai) return;
    if (filterKes === 'belum' && isSesuai) return;
    
    if (isSesuai) {
      kesesuaianBadge = '<i class="fas fa-check-circle" style="color: #10b981; font-size: 1.2rem;"></i>';
    } else if (statusLower.includes('belum') || statusLower === '') {
      kesesuaianBadge = '<i class="fas fa-times-circle" style="color: #ef4444; font-size: 1.2rem;"></i>';
    } else {
      kesesuaianBadge = '-';
    }

    let monthsToRender = [];
    if (activeMonthIdx === 'all') {
      monthsToRender = [0,1,2,3,4,5,6,7,8,9,10,11];
    } else {
      monthsToRender = [parseInt(activeMonthIdx)];
    }

    monthsToRender.forEach(idx => {
      const st = m.monthlyStatus[idx];
      
      // Apply status filter
      if (filterSt !== 'all' && st.status !== filterSt) return;
      
      // If view is 'all', maybe don't show 'na' to reduce spam, unless explicitly asked
      if (activeMonthIdx === 'all' && filterSt === 'all' && st.status === 'na') return;

      let nominalText = '';
      let periodeText = MONTHS[idx];
      let tglText = '-';

      if (st.status === 'na') {
        nominalText = '-';
      } else if (st.status === 'lunas') {
        nominalText = `<span style="color: #10b981;">${formatRp(m.iuranBulan)}</span>`;
        tglText = st.raw || '-';
      } else {
        nominalText = `<span style="color: #ef4444;">Rp 0</span>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${no++}</td>
        <td style="font-weight:500;">${m.nama}</td>
        <td><span class="badge-skala">${m.skala}</span></td>
        <td style="font-weight:600; color: #374151;">${periodeText}</td>
        <td>${formatRp(m.iuranBulan)}</td>
        <td style="font-weight:600;">${formatRp(m.iuranSeharusnyaBase)}</td>
        <td style="font-weight:600;">${nominalText}</td>
        <td style="font-size: 0.85rem; color: #4b5563;">${tglText}</td>
        <td style="text-align:center;">${kesesuaianBadge}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

let chartMode = 'cash';

function renderTrenChart() {
  const ctx = document.getElementById('chart-tren');
  if (!ctx) return;
  if (chartTren) { chartTren.destroy(); chartTren = null; }

  const nominal = [];
  
  for (let m = 0; m < 12; m++) {
    let nom = 0;
    membersData.forEach(mem => {
      if (chartMode === 'accrual') {
        // Accrual basis: diakui pada bulan kewajiban jika lunas
        const st = mem.monthlyStatus[m];
        if (st.status === 'lunas') {
          nom += mem.iuranBulan;
        }
      } else {
        // Cash basis: diakui pada bulan saat transaksi dilakukan, terlepas dari kewajiban bulan apa
        mem.monthlyStatus.forEach(st => {
          if (st.status === 'lunas' && st.trxMonth === m) {
            nom += mem.iuranBulan;
          }
        });
      }
    });
    nominal.push(nom);
  }

  // Update button active states
  const accrualBtn = document.getElementById('chart-accrual-btn');
  const cashBtn = document.getElementById('chart-cash-btn');
  if (accrualBtn && cashBtn) {
    if (chartMode === 'accrual') {
      accrualBtn.style.background = 'var(--blue)';
      accrualBtn.style.color = 'white';
      accrualBtn.style.border = 'none';
      cashBtn.style.background = 'white';
      cashBtn.style.color = '#4b5563';
      cashBtn.style.border = '1px solid #d1d5db';
    } else {
      cashBtn.style.background = 'var(--blue)';
      cashBtn.style.color = 'white';
      cashBtn.style.border = 'none';
      accrualBtn.style.background = 'white';
      accrualBtn.style.color = '#4b5563';
      accrualBtn.style.border = '1px solid #d1d5db';
    }
  }

  const datasets = [
    {
      label: chartMode === 'accrual' ? 'Total Iuran Seharusnya (Rp)' : 'Total Pemasukan Riil (Rp)',
      data: nominal,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 3,
      pointRadius: 5,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#3b82f6',
      pointBorderWidth: 2,
      fill: true,
      tension: 0.3
    }
  ];

  if (chartMode === 'cash') {
    const sum = nominal.reduce((a, b) => a + b, 0);
    // Hitung rata-rata berdasarkan bulan yang sudah berjalan (YTD) agar tidak drop karena bulan depan masih 0
    const elapsedMonths = Math.max(1, new Date().getMonth() + 1);
    const avg = sum / elapsedMonths;
    const avgData = new Array(12).fill(avg);
    
    datasets.push({
      label: 'Rata-rata Pemasukan (YTD)',
      data: avgData,
      borderColor: '#f59e0b', // amber / orange color for average line
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      tension: 0
    });
  }

  chartTren = new Chart(ctx, {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ' ' + context.dataset.label + ': ' + formatRp(context.raw);
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
        x: {
          grid: { display: false }
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

    // Build month dropdown options
    const fSel = document.getElementById('month-filter');
    if (fSel) {
      let html = `<option value="all">Semua Bulan</option>`;
      MONTHS.forEach((m, i) => {
        html += `<option value="${i}">${m}</option>`;
      });
      fSel.innerHTML = html;
      
      fSel.addEventListener('change', (e) => {
        const val = e.target.value;
        window.filterMonth(val === 'all' ? 'all' : parseInt(val));
      });
    }

    // Attach filter listeners
    document.getElementById('search-input')?.addEventListener('input', renderTable);
    const sel = document.getElementById('status-filter');
    if (sel) {
      sel.addEventListener('change', () => {
        renderTable();
      });
    }
    const selKes = document.getElementById('kesesuaian-filter');
    if (selKes) {
      selKes.addEventListener('change', () => {
        renderTable();
      });
    }

    document.getElementById('chart-accrual-btn')?.addEventListener('click', () => {
      chartMode = 'accrual';
      renderTrenChart();
    });
    
    document.getElementById('chart-cash-btn')?.addEventListener('click', () => {
      chartMode = 'cash';
      renderTrenChart();
    });

    const tblContainer = document.querySelector('.table-container');
    if (tblContainer && activeTab === 'pemasukan') {
      tblContainer.style.display = 'none';
    }

    updateDashboard();
    renderTrenChart(); // Draw chart once on load

    if (loadingState) loadingState.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';

    // Set default tab explicitly

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

