// timeline.js - Timeline Event Besar FOZ (16:9 Fit View)
(function() {
  const TIMELINE_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPLWmWrZXEFFUxR6gmForZ-FgPCc1ePG_AxNRnac3RApPSPKi9oLH8AKGk3BdChAFZ5rbv6Mg2KQkd/pub?gid=1437698506&single=true&output=csv';

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

  function extractYear(waktu) {
    if (!waktu) return 'Lainnya';
    const match = waktu.match(/\b(202[0-9])\b/);
    return match ? match[1] : 'Lainnya';
  }

  async function loadTimelineData() {
    try {
      const res = await fetch(TIMELINE_CSV_URL + '&_t=' + Date.now());
      const text = await res.text();
      const rows = parseCSV(text);

      if (rows.length < 2) return;

      const headers = rows[0].map(h => h.toLowerCase().trim());
      // Columns: Waktu Pelaksanaan, Nama Event, Tema, Pembahasan Utama, Status
      const idxWaktu = headers.findIndex(h => h.includes('waktu') || h.includes('tanggal'));
      const idxNama = headers.findIndex(h => h.includes('nama') || h.includes('event'));
      const idxTema = headers.findIndex(h => h.includes('tema'));
      const idxBahasan = headers.findIndex(h => h.includes('pembahasan') || h.includes('utama'));
      const idxStatus = headers.findIndex(h => h.includes('status'));

      const events = rows.slice(1).map(row => {
        const waktu = idxWaktu !== -1 ? row[idxWaktu] : '';
        return {
          waktu: waktu,
          year: extractYear(waktu),
          nama: idxNama !== -1 ? row[idxNama] : '',
          tema: idxTema !== -1 ? row[idxTema] : '',
          bahasan: idxBahasan !== -1 ? row[idxBahasan] : '',
          status: idxStatus !== -1 ? (row[idxStatus] || 'Akan Dilaksanakan').trim() : 'Akan Dilaksanakan'
        };
      }).filter(e => e.nama);

      renderTimeline(events);
    } catch (err) {
      console.error('Error loading timeline data:', err);
    }
  }

  function renderTimeline(events) {
    let terlaksanaCount = 0;
    let akanCount = 0;

    const eventsByYear = {
      '2024': [],
      '2025': [],
      '2026': [],
      '2027': []
    };

    events.forEach(e => {
      const st = e.status.toLowerCase();
      if (st.includes('sudah') || st.includes('terlaksana')) terlaksanaCount++;
      else akanCount++;

      const y = e.year;
      if (eventsByYear[y]) {
        eventsByYear[y].push(e);
      } else {
        eventsByYear['2026'].push(e); // Fallback
      }
    });

    // Update Counters
    const elTerlaksana = document.getElementById('stat-terlaksana-count');
    if (elTerlaksana) elTerlaksana.textContent = terlaksanaCount;

    const elAkan = document.getElementById('stat-akan-count');
    if (elAkan) elAkan.textContent = akanCount;

    // Render Years 2024-2027
    ['2024', '2025', '2026', '2027'].forEach(year => {
      const badge = document.getElementById(`badge-${year}`);
      const listContainer = document.getElementById(`events-${year}`);
      const yearEvents = eventsByYear[year] || [];

      if (badge) badge.textContent = `${yearEvents.length} Event`;

      if (listContainer) {
        if (yearEvents.length === 0) {
          listContainer.innerHTML = `<div style="text-align: center; color: #9ca3af; font-size: 0.78rem; padding: 20px 10px;">Belum ada event terjadwal</div>`;
          return;
        }

        let html = '';
        yearEvents.forEach(ev => {
          const isTerlaksana = ev.status.toLowerCase().includes('sudah') || ev.status.toLowerCase().includes('terlaksana');
          const borderCls = isTerlaksana ? '' : 'akan-datang';
          const badgeCls = isTerlaksana ? 'badge-terlaksana' : 'badge-akan';
          const badgeIcon = isTerlaksana ? 'ph-check-circle' : 'ph-clock';

          html += `
            <div class="event-card ${borderCls}">
              <div class="event-date">
                <i class="ph-light ph-calendar-blank" style="color: #10b981;"></i> ${ev.waktu}
              </div>
              <h5 class="event-name">${ev.nama}</h5>

              ${ev.tema ? `<div style="font-size: 0.74rem; color: #6b7280; margin-bottom: 6px; font-style: italic;">"${ev.tema}"</div>` : ''}
              ${ev.bahasan ? `<div style="font-size: 0.73rem; color: #4b5563; margin-bottom: 6px;">📌 ${ev.bahasan}</div>` : ''}

              <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between;">
                <span class="event-status-badge ${badgeCls}"><i class="ph ${badgeIcon}"></i> ${ev.status}</span>
              </div>
            </div>
          `;
        });

        listContainer.innerHTML = html;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', loadTimelineData);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadTimelineData();
  }
})();
