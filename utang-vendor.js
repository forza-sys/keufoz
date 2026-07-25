// --- Utang Mitra & Tagihan Pihak Ketiga Module ---

const VENDOR_DATA = [
  { no: 'INV-2026/088', vendor: 'PT Media Zakat Nusantara', perihal: 'Publikasi Media Kit & Press Release Munas', due: '15 Jul 2026', nominal: 12500000, status: 'Belum Lunas' },
  { no: 'INV-2026/092', vendor: 'CV Solusi Digital Kreatif', perihal: 'Maintenance Server & Security Audit Web', due: '28 Jul 2026', nominal: 22000000, status: 'Belum Lunas' },
  { no: 'INV-2026/071', vendor: 'Hotel Indonesia Kempinski', perihal: 'Pelayatan & Ballroom Event Leaders Talk', due: '10 Jun 2026', nominal: 45000000, status: 'Lunas' },
  { no: 'INV-2026/065', vendor: 'Percetakan Bina Grafika', perihal: 'Cetak Buku Laporan Tahunan FOZ 2025', due: '20 Mei 2026', nominal: 18200000, status: 'Lunas' },
  { no: 'INV-2026/054', vendor: 'PT Transportasi Solusindo', perihal: 'Sewa Bus Rombongan Rakernas FOZ', due: '05 Mei 2026', nominal: 15000000, status: 'Lunas' }
];

function renderVendorTable() {
  const tbody = document.getElementById('ap-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  VENDOR_DATA.forEach(item => {
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
    tbody.appendChild(tr);
  });
}

async function initVendorModule() {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('dashboard-content');

  renderVendorTable();

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initVendorModule);
window.pjaxInitDashboard = initVendorModule;
