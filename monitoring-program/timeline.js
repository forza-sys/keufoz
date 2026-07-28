// timeline.js - Interactive Horizontal Diagram Benchmark (16:9 Fit-to-Screen View)
(function() {
  const TIMELINE_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPLWmWrZXEFFUxR6gmForZ-FgPCc1ePG_AxNRnac3RApPSPKi9oLH8AKGk3BdChAFZ5rbv6Mg2KQkd/pub?gid=1437698506&single=true&output=csv';

  let rawTimelineEvents = [];
  let currentSelectedYear = '2026';

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

  function parseMonthIndex(str) {
    if (!str) return 0;
    const lower = str.toLowerCase();
    if (lower.includes('jan')) return 0;
    if (lower.includes('feb')) return 1;
    if (lower.includes('mar')) return 2;
    if (lower.includes('apr')) return 3;
    if (lower.includes('mei') || lower.includes('may')) return 4;
    if (lower.includes('jun')) return 5;
    if (lower.includes('jul')) return 6;
    if (lower.includes('agu') || lower.includes('aug')) return 7;
    if (lower.includes('sep')) return 8;
    if (lower.includes('okt') || lower.includes('oct')) return 9;
    if (lower.includes('nov')) return 10;
    if (lower.includes('des') || lower.includes('dec')) return 11;
    return 0;
  }

  function parseEventDates(waktuStr) {
    if (!waktuStr) return { year: '2026', startMonth: 0, endMonth: 0, isRange: false };

    const yearMatch = waktuStr.match(/\b(202[0-9])\b/);
    const year = yearMatch ? yearMatch[1] : '2026';

    const parts = waktuStr.split('-').map(p => p.trim());
    if (parts.length === 2 && parts[0].match(/[a-zA-Z]/) && parts[1].match(/[a-zA-Z]/)) {
      const startMonth = parseMonthIndex(parts[0]);
      const endMonth = parseMonthIndex(parts[1]);
      return { year, startMonth, endMonth, isRange: true };
    }

    const startMonth = parseMonthIndex(waktuStr);
    return { year, startMonth, endMonth: startMonth, isRange: false };
  }

  async function loadData() {
    try {
      const res = await fetch(TIMELINE_CSV_URL + '&_t=' + Date.now());
      const text = await res.text();
      const rows = parseCSV(text);

      if (rows.length < 2) return;

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const idxWaktu = headers.findIndex(h => h.includes('waktu') || h.includes('tanggal'));
      const idxNama = headers.findIndex(h => h.includes('nama') || h.includes('event'));
      const idxTema = headers.findIndex(h => h.includes('tema'));
      const idxBahasan = headers.findIndex(h => h.includes('pembahasan') || h.includes('utama'));
      const idxStatus = headers.findIndex(h => h.includes('status'));

      rawTimelineEvents = rows.slice(1).map(row => {
        const waktu = idxWaktu !== -1 ? row[idxWaktu] : '';
        const parsedDate = parseEventDates(waktu);
        return {
          waktu: waktu,
          year: parsedDate.year,
          startMonth: parsedDate.startMonth,
          endMonth: parsedDate.endMonth,
          isRange: parsedDate.isRange,
          nama: idxNama !== -1 ? row[idxNama] : '',
          tema: idxTema !== -1 ? row[idxTema] : '',
          bahasan: idxBahasan !== -1 ? row[idxBahasan] : '',
          status: idxStatus !== -1 ? (row[idxStatus] || 'Akan Dilaksanakan').trim() : 'Akan Dilaksanakan'
        };
      }).filter(e => e.nama);

      initTabEvents();
      renderDiagram();
    } catch (err) {
      console.error('Error loading diagram timeline data:', err);
    }
  }

  function initTabEvents() {
    document.querySelectorAll('.year-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.year-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSelectedYear = btn.getAttribute('data-year');

        const activeDisplay = document.getElementById('active-year-display');
        if (activeDisplay) {
          activeDisplay.textContent = currentSelectedYear === 'ALL' ? 'Semua Tahun (2024-2027)' : `Tahun ${currentSelectedYear}`;
        }

        renderDiagram();
      });
    });
  }

  function renderDiagram() {
    const axisContainer = document.getElementById('axis-nodes-container');
    if (!axisContainer) return;

    // Filter events by selected year
    const filteredEvents = rawTimelineEvents.filter(e => {
      return currentSelectedYear === 'ALL' || e.year === currentSelectedYear;
    });

    // Update Stats Badge
    const statsBadge = document.getElementById('event-stats-badge');
    if (statsBadge) {
      const terlaksana = filteredEvents.filter(e => e.status.toLowerCase().includes('sudah') || e.status.toLowerCase().includes('terlaksana')).length;
      statsBadge.textContent = `${filteredEvents.length} Event (${terlaksana} Terlaksana, ${filteredEvents.length - terlaksana} Akan Datang)`;
    }

    // Build Axis Nodes HTML
    let axisHTML = '';
    const nodeCount = 12;

    for (let i = 0; i < nodeCount; i++) {
      const leftPct = (i / (nodeCount - 1)) * 100;
      axisHTML += `
        <div class="axis-node" style="position: absolute; left: ${leftPct}%; top: 50%; transform: translate(-50%, -50%);" data-month="${i}">
          <div class="axis-label">${MONTH_NAMES[i]}</div>
        </div>
      `;
    }

    // Single / Point Events (Rendered Above Axis)
    const pointEvents = filteredEvents.filter(e => !e.isRange);
    let heightTiers = [110, 160, 210, 130, 180]; // Stagger heights to prevent overlap
    let tierIdx = 0;

    pointEvents.forEach(ev => {
      const mIdx = ev.startMonth;
      const leftPct = (mIdx / (nodeCount - 1)) * 100;
      const connectorHeight = heightTiers[tierIdx % heightTiers.length];
      tierIdx++;

      const isTerlaksana = ev.status.toLowerCase().includes('sudah') || ev.status.toLowerCase().includes('terlaksana');
      const badgeCls = isTerlaksana ? 'terlaksana' : 'akan';

      axisHTML += `
        <div class="event-pin" style="left: ${leftPct}%; bottom: 6px;" onclick="showTooltip('${encodeURIComponent(JSON.stringify(ev))}', event)">
          <div class="pin-badge ${badgeCls}">
            <div class="pin-date">${ev.waktu}</div>
            <div class="pin-title">${ev.nama}</div>
          </div>
          <div class="pin-shape"></div>
          <div class="pin-connector" style="height: ${connectorHeight}px;"></div>
        </div>
      `;
    });

    // Range Events (Rendered Below Axis)
    const rangeEvents = filteredEvents.filter(e => e.isRange);
    let rangeTopOffset = 36;

    rangeEvents.forEach(ev => {
      const startPct = (ev.startMonth / (nodeCount - 1)) * 100;
      const endPct = (ev.endMonth / (nodeCount - 1)) * 100;
      const widthPct = Math.max(5, endPct - startPct);
      const isTerlaksana = ev.status.toLowerCase().includes('sudah') || ev.status.toLowerCase().includes('terlaksana');

      axisHTML += `
        <div class="range-bar-item ${isTerlaksana ? 'terlaksana' : ''}" style="left: ${startPct}%; width: ${widthPct}%; top: ${rangeTopOffset}px;" onclick="showTooltip('${encodeURIComponent(JSON.stringify(ev))}', event)">
          <div class="range-dot"></div>
          <div class="range-text">${ev.nama} (${ev.waktu})</div>
          <div class="range-dot"></div>
        </div>
      `;

      rangeTopOffset += 34; // Stack downward for multiple range bars
    });

    axisContainer.innerHTML = axisHTML;
  }

  window.showTooltip = function(jsonStr, event) {
    if (event) event.stopPropagation();
    try {
      const ev = JSON.parse(decodeURIComponent(jsonStr));
      const tooltip = document.getElementById('event-tooltip');
      if (!tooltip) return;

      document.getElementById('tooltip-date').textContent = ev.waktu;
      document.getElementById('tooltip-title').textContent = ev.nama;

      const isTerlaksana = ev.status.toLowerCase().includes('sudah') || ev.status.toLowerCase().includes('terlaksana');
      const statusEl = document.getElementById('tooltip-status');
      statusEl.textContent = ev.status;
      statusEl.style.background = isTerlaksana ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)';
      statusEl.style.color = isTerlaksana ? '#059669' : '#2563eb';

      let desc = '';
      if (ev.tema) desc += `<strong>Tema:</strong> ${ev.tema}<br>`;
      if (ev.bahasan) desc += `<strong>Pembahasan:</strong> ${ev.bahasan}`;
      if (!desc) desc = 'Event resmi Forum Zakat dalam agenda nasional.';

      document.getElementById('tooltip-desc').innerHTML = desc;
      tooltip.style.display = 'block';
    } catch (err) {
      console.error('Tooltip error:', err);
    }
  };

  document.addEventListener('DOMContentLoaded', loadData);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadData();
  }
})();
