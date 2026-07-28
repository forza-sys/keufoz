// program.js - Monitoring Program FOZ
(function() {
  const PROGRAM_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPLWmWrZXEFFUxR6gmForZ-FgPCc1ePG_AxNRnac3RApPSPKi9oLH8AKGk3BdChAFZ5rbv6Mg2KQkd/pub?gid=1410501230&single=true&output=csv';

  let rawProgramsData = [];
  let currentCategory = 'ALL';
  let statusChartInstance = null;
  let bidangChartInstance = null;

  function parseCSV(text) {
    const lines = [];
    let curLine = [];
    let curToken = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const nextC = text[i + 1];

      if (c === '"') {
        if (inQuotes && nextC === '"') {
          curToken += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        curLine.push(curToken.trim());
        curToken = '';
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && nextC === '\n') i++;
        curLine.push(curToken.trim());
        if (curLine.some(cell => cell.length > 0)) {
          lines.push(curLine);
        }
        curLine = [];
        curToken = '';
      } else {
        curToken += c;
      }
    }
    if (curToken.length > 0 || curLine.length > 0) {
      curLine.push(curToken.trim());
      if (curLine.some(cell => cell.length > 0)) {
        lines.push(curLine);
      }
    }
    return lines;
  }

  async function loadData() {
    try {
      const res = await fetch(PROGRAM_CSV_URL + '&_t=' + Date.now());
      const text = await res.text();
      const rows = parseCSV(text);

      if (rows.length < 2) return;

      const headers = rows[0].map(h => h.toLowerCase().trim());
      // Columns: No, Nama Program, Bidang, Acuan, Persentase, Status, Keterangan
      const idxNo = headers.findIndex(h => h.includes('no'));
      const idxNama = headers.findIndex(h => h.includes('nama'));
      const idxBidang = headers.findIndex(h => h.includes('bidang'));
      const idxAcuan = headers.findIndex(h => h.includes('acuan'));
      const idxPct = headers.findIndex(h => h.includes('persentase') || h.includes('progres'));
      const idxStatus = headers.findIndex(h => h.includes('status'));
      const idxKet = headers.findIndex(h => h.includes('keterangan'));

      rawProgramsData = rows.slice(1).map(row => {
        const pctRaw = idxPct !== -1 ? (row[idxPct] || '').replace('%', '').trim() : '';
        const pctVal = parseFloat(pctRaw);
        return {
          no: idxNo !== -1 ? row[idxNo] : '',
          nama: idxNama !== -1 ? row[idxNama] : '',
          bidang: idxBidang !== -1 ? row[idxBidang] : '',
          acuan: idxAcuan !== -1 ? row[idxAcuan] : '',
          pct: isNaN(pctVal) ? null : pctVal,
          status: idxStatus !== -1 ? (row[idxStatus] || 'Belum Terdefinisi').trim() : 'Belum Terdefinisi',
          ket: idxKet !== -1 ? row[idxKet] : ''
        };
      }).filter(p => p.nama);

      initCategoryTabs();
      renderAll();
    } catch (err) {
      console.error('Error loading program data:', err);
      const container = document.getElementById('program-cards-list');
      if (container) {
        container.innerHTML = `<div style="grid-column: 1/-1; color: #ef4444; padding: 20px; text-align: center;">Gagal memuat data program: ${err.message}</div>`;
      }
    }
  }

  function getUniqueCategories() {
    const cats = new Set();
    rawProgramsData.forEach(p => {
      if (p.bidang) cats.add(p.bidang);
    });
    // Order logically
    const predefinedOrder = ['Bidang I', 'Bidang II', 'Bidang III', 'Bidang IV', 'Bidang V', 'SAI', 'Sekum & Wasekum', 'Waketum', 'Bendum'];
    const sorted = Array.from(cats).sort((a, b) => {
      let idxA = predefinedOrder.indexOf(a);
      let idxB = predefinedOrder.indexOf(b);
      if (idxA === -1) idxA = 99;
      if (idxB === -1) idxB = 99;
      return idxA - idxB;
    });
    return sorted;
  }

  function initCategoryTabs() {
    const container = document.getElementById('category-tabs-container');
    if (!container) return;

    const categories = getUniqueCategories();
    let html = `<button class="cat-tab-btn ${currentCategory === 'ALL' ? 'active' : ''}" data-cat="ALL">Semua Bidang</button>`;

    categories.forEach(cat => {
      html += `<button class="cat-tab-btn ${currentCategory === cat ? 'active' : ''}" data-cat="${cat}">${cat}</button>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('.cat-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.getAttribute('data-cat');
        renderAll();
      });
    });
  }

  function getFilteredData() {
    const searchVal = (document.getElementById('search-program-input')?.value || '').toLowerCase();
    const statusVal = document.getElementById('status-filter-select')?.value || 'ALL';

    return rawProgramsData.filter(p => {
      const matchCat = (currentCategory === 'ALL' || p.bidang === currentCategory);
      const matchStatus = (statusVal === 'ALL' || p.status.toLowerCase() === statusVal.toLowerCase());
      const matchSearch = !searchVal || 
        p.nama.toLowerCase().includes(searchVal) || 
        p.acuan.toLowerCase().includes(searchVal) || 
        p.bidang.toLowerCase().includes(searchVal) ||
        p.ket.toLowerCase().includes(searchVal);

      return matchCat && matchStatus && matchSearch;
    });
  }

  function renderKPI(filteredData) {
    const total = filteredData.length;
    let selesaiCount = 0;
    let processCount = 0;
    let rencanaCount = 0;
    let totalPct = 0;
    let pctCount = 0;

    filteredData.forEach(p => {
      const st = p.status.toLowerCase();
      if (st.includes('selesai') || st.includes('berjalan')) selesaiCount++;
      else if (st.includes('process') || st.includes('proses')) processCount++;
      else if (st.includes('rencana') || st.includes('direncanakan')) rencanaCount++;

      if (p.pct !== null) {
        totalPct += p.pct;
        pctCount++;
      }
    });

    const avgPct = pctCount > 0 ? Math.round(totalPct / pctCount) : 0;

    const elTotal = document.getElementById('kpi-total-proker');
    if (elTotal) elTotal.textContent = total;

    const elSelesai = document.getElementById('kpi-selesai-proker');
    if (elSelesai) elSelesai.textContent = selesaiCount;
    const elSelesaiPct = document.getElementById('kpi-selesai-pct');
    if (elSelesaiPct) elSelesaiPct.textContent = total > 0 ? Math.round((selesaiCount / total) * 100) + '% dari total' : '0%';

    const elProcess = document.getElementById('kpi-process-proker');
    if (elProcess) elProcess.textContent = processCount;
    const elProcessPct = document.getElementById('kpi-process-pct');
    if (elProcessPct) elProcessPct.textContent = total > 0 ? Math.round((processCount / total) * 100) + '% dari total' : '0%';

    const elRencana = document.getElementById('kpi-rencana-proker');
    if (elRencana) elRencana.textContent = rencanaCount;
    const elRencanaPct = document.getElementById('kpi-rencana-pct');
    if (elRencanaPct) elRencanaPct.textContent = total > 0 ? Math.round((rencanaCount / total) * 100) + '% dari total' : '0%';

    const elAvg = document.getElementById('kpi-avg-progress');
    if (elAvg) elAvg.textContent = avgPct + '%';
  }

  function getStatusBadgeClass(status) {
    const st = (status || '').toLowerCase();
    if (st.includes('selesai') || st.includes('berjalan')) return { cls: 'status-selesai', icon: 'ph-check-circle' };
    if (st.includes('process') || st.includes('proses')) return { cls: 'status-process', icon: 'ph-clock' };
    if (st.includes('rencana') || st.includes('direncanakan')) return { cls: 'status-direncanakan', icon: 'ph-calendar' };
    return { cls: 'status-belum', icon: 'ph-question' };
  }

  function renderCards(filteredData) {
    const container = document.getElementById('program-cards-list');
    if (!container) return;

    if (filteredData.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #9ca3af; background: var(--card-bg, #fff); border-radius: 14px; border: 1.5px dashed #e5e7eb;">Tidak ada program kerja yang cocok dengan filter.</div>`;
      return;
    }

    let html = '';
    filteredData.forEach(p => {
      const badgeInfo = getStatusBadgeClass(p.status);
      const hasPct = p.pct !== null;
      const pctDisplay = hasPct ? p.pct + '%' : '-';

      html += `
        <div class="program-card">
          <div>
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.1); padding: 2px 8px; border-radius: 6px;">${p.bidang || 'Lainnya'}</span>
              <span class="status-badge ${badgeInfo.cls}"><i class="ph ${badgeInfo.icon}"></i> ${p.status}</span>
            </div>
            <h4 style="font-size: 0.92rem; font-weight: 700; color: var(--heading-color, #111827); margin: 0 0 10px 0; line-height: 1.4;">${p.nama}</h4>
            
            ${p.acuan ? `<div style="font-size: 0.78rem; color: #6b7280; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;"><i class="ph-light ph-bookmark" style="color: #9ca3af;"></i> ${p.acuan}</div>` : ''}
          </div>

          <div>
            ${hasPct ? `
              <div style="margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.76rem; font-weight: 600; color: #4b5563; margin-bottom: 4px;">
                  <span>Capaian Progress</span>
                  <span style="color: #10b981; font-weight: 700;">${pctDisplay}</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${Math.min(100, Math.max(0, p.pct))}%;"></div>
                </div>
              </div>
            ` : ''}

            ${p.ket ? `<div style="margin-top: 10px; font-size: 0.75rem; color: #6b7280; background: rgba(243, 244, 246, 0.6); padding: 6px 10px; border-radius: 8px;">ℹ️ ${p.ket}</div>` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function renderCharts(filteredData) {
    // 1. Status Donut Chart
    const statusCounts = {
      'Selesai/Berjalan': 0,
      'On Process': 0,
      'Direncanakan': 0,
      'Belum Terdefinisi': 0
    };

    filteredData.forEach(p => {
      const st = p.status.toLowerCase();
      if (st.includes('selesai') || st.includes('berjalan')) statusCounts['Selesai/Berjalan']++;
      else if (st.includes('process') || st.includes('proses')) statusCounts['On Process']++;
      else if (st.includes('rencana') || st.includes('direncanakan')) statusCounts['Direncanakan']++;
      else statusCounts['Belum Terdefinisi']++;
    });

    const ctxStatus = document.getElementById('statusDonutChart')?.getContext('2d');
    if (ctxStatus) {
      if (statusChartInstance) statusChartInstance.destroy();
      statusChartInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#9ca3af'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          },
          cutout: '65%'
        }
      });
    }

    // 2. Bidang Bar Chart
    const bidangCounts = {};
    filteredData.forEach(p => {
      const b = p.bidang || 'Lainnya';
      bidangCounts[b] = (bidangCounts[b] || 0) + 1;
    });

    const ctxBidang = document.getElementById('bidangBarChart')?.getContext('2d');
    if (ctxBidang) {
      if (bidangChartInstance) bidangChartInstance.destroy();
      bidangChartInstance = new Chart(ctxBidang, {
        type: 'bar',
        data: {
          labels: Object.keys(bidangCounts),
          datasets: [{
            label: 'Jumlah Program',
            data: Object.values(bidangCounts),
            backgroundColor: '#3b82f6',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
            x: { ticks: { font: { size: 10 } } }
          }
        }
      });
    }
  }

  function renderAll() {
    const filtered = getFilteredData();
    renderKPI(filtered);
    renderCards(filtered);
    renderCharts(filtered);
  }

  function initEvents() {
    const searchInput = document.getElementById('search-program-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => renderAll());
    }

    const statusSelect = document.getElementById('status-filter-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', () => renderAll());
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initEvents();
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadData();
    initEvents();
  }
})();
