// --- Utang & Piutang Mitra Module ---

const UTANG_MITRA_DATA = [
  { no: 'INV-2026/088', vendor: 'PT Media Zakat Nusantara', perihal: 'Publikasi Media Kit & Press Release Munas', due: '15 Jul 2026', nominal: 12500000, status: 'Belum Lunas' },
  { no: 'INV-2026/092', vendor: 'CV Solusi Digital Kreatif', perihal: 'Maintenance Server & Security Audit Web', due: '28 Jul 2026', nominal: 22000000, status: 'Belum Lunas' },
  { no: 'INV-2026/071', vendor: 'Hotel Indonesia Kempinski', perihal: 'Pelayatan & Ballroom Event Leaders Talk', due: '10 Jun 2026', nominal: 45000000, status: 'Lunas' },
  { no: 'INV-2026/065', vendor: 'Percetakan Bina Grafika', perihal: 'Cetak Buku Laporan Tahunan FOZ 2025', due: '20 Mei 2026', nominal: 18200000, status: 'Lunas' },
  { no: 'INV-2026/054', vendor: 'PT Transportasi Solusindo', perihal: 'Sewa Bus Rombongan Rakernas FOZ', due: '05 Mei 2026', nominal: 15000000, status: 'Lunas' }
];

const PIUTANG_MITRA_DATA = [
  { kode: 'MOU-SP/2026/01', mitra: 'PT Bank Syariah Indonesia (BSI)', perihal: 'Sponsorship Utama Munas & Rakernas FOZ', target: '10 Ags 2026', nominal: 75000000, status: 'Term 2 Belum Cair' },
  { kode: 'MOU-SP/2026/02', mitra: 'PT Paragon Technology (Wardah)', perihal: 'Sponsorship Platinum Event Women in Zakat', target: '25 Ags 2026', nominal: 35000000, status: 'Belum Cair' },
  { kode: 'MOU-HB/2026/04', mitra: 'Lembaga Hibah Global Sumud', perihal: 'Hibah Program Kemanusiaan & Advokasi', target: '15 Sep 2026', nominal: 15000000, status: 'Proses Pencairan' }
];

function switchMitraTab(tab) {
  const btnUtang = document.getElementById('tab-btn-utang');
  const btnPiutang = document.getElementById('tab-btn-piutang');
  const panelUtang = document.getElementById('panel-utang');
  const panelPiutang = document.getElementById('panel-piutang');

  if (tab === 'utang') {
    btnUtang.classList.add('active');
    btnPiutang.classList.remove('active');
    panelUtang.style.display = 'block';
    panelPiutang.style.display = 'none';
  } else {
    btnPiutang.classList.add('active');
    btnUtang.classList.remove('active');
    panelPiutang.style.display = 'block';
    panelUtang.style.display = 'none';
  }
}

function renderMitraTables() {
  // Render Utang
  const tbodyUtang = document.getElementById('utang-table-body');
  if (tbodyUtang) {
    tbodyUtang.innerHTML = '';
    UTANG_MITRA_DATA.forEach(item => {
      const tr = document.createElement('tr');
      const badgeClass = item.status === 'Lunas' ? 'badge-lunas' : 'badge-unpaid';

      tr.innerHTML = `
        <td style="font-weight:600; color:var(--blue);">${item.no}</td>
        <td style="font-weight:600;">${item.vendor}</td>
        <td>${item.perihal}</td>
        <td>${item.due}</td>
        <td style="font-weight:700; ${item.status === 'Belum Lunas' ? 'color:var(--red);' : ''}">Rp ${item.nominal.toLocaleString('id-ID')}</td>
        <td><span class="${badgeClass}">${item.status}</span></td>
        <td style="text-align:center;">
          <button onclick="alert('Pelunasan Tagihan ${item.no}')" style="border:none; background:rgba(16,185,129,0.1); color:var(--green); padding:4px 10px; border-radius:6px; font-size:0.78rem; cursor:pointer; font-weight:600;">
            <i class="fas fa-credit-card"></i> Lunasi
          </button>
        </td>
      `;
      tbodyUtang.appendChild(tr);
    });
  }

  // Render Piutang
  const tbodyPiutang = document.getElementById('piutang-table-body');
  if (tbodyPiutang) {
    tbodyPiutang.innerHTML = '';
    PIUTANG_MITRA_DATA.forEach(item => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td style="font-weight:600; color:var(--green);">${item.kode}</td>
        <td style="font-weight:600;">${item.mitra}</td>
        <td>${item.perihal}</td>
        <td>${item.target}</td>
        <td style="font-weight:700; color:var(--green);">Rp ${item.nominal.toLocaleString('id-ID')}</td>
        <td><span class="badge-pending">${item.status}</span></td>
        <td style="text-align:center;">
          <button onclick="alert('Penagihan / Follow-Up ${item.kode}')" style="border:none; background:rgba(59,130,246,0.1); color:var(--blue); padding:4px 10px; border-radius:6px; font-size:0.78rem; cursor:pointer; font-weight:600;">
            <i class="fas fa-paper-plane"></i> Follow-Up Tagihan
          </button>
        </td>
      `;
      tbodyPiutang.appendChild(tr);
    });
  }
}

async function initVendorModule() {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('dashboard-content');

  renderMitraTables();

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initVendorModule);
window.pjaxInitDashboard = initVendorModule;
