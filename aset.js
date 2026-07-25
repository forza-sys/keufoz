// --- Aset Tetap & Inventaris FOZ Module ---

const ASSET_DATA = [
  { kode: 'AST-FOZ-001', nama: 'MacBook Air M3 Staf Keuangan', kat: 'Elektronik & IT', tgl: '12 Jan 2024', beli: 18500000, buku: 13875000, pj: 'Staf Keuangan', kondisi: 'Baik' },
  { kode: 'AST-FOZ-002', nama: 'Server Cloud & Infrastructure NAS', kat: 'Server & IT', tgl: '05 Mar 2024', beli: 32000000, buku: 24000000, pj: 'Tim IT FOZ', kondisi: 'Baik' },
  { kode: 'AST-FOZ-003', nama: 'Printer Heavy Duty Epson L15150', kat: 'Peralatan Kantor', tgl: '18 Jun 2024', beli: 12500000, buku: 9375000, pj: 'Sekretariat', kondisi: 'Baik' },
  { kode: 'AST-FOZ-004', nama: 'Set Meja & Kursi RUA Sekretariat', kat: 'Furniture', tgl: '10 Jan 2023', beli: 28000000, buku: 16800000, pj: 'Sekretariat', kondisi: 'Baik' },
  { kode: 'AST-FOZ-005', nama: 'Projector Epson Full HD Wireless', kat: 'Elektronik & IT', tgl: '22 Sep 2024', beli: 9500000, buku: 8075000, pj: 'Bidang Kapasitas', kondisi: 'Baik' },
  { kode: 'AST-FOZ-006', nama: 'Sound System Portable Event FOZ', kat: 'Peralatan Event', tgl: '04 Nov 2024', beli: 14500000, buku: 12325000, pj: 'Bidang Keanggotaan', kondisi: 'Perlu Perbaikan' }
];

function renderAssetTable() {
  const tbody = document.getElementById('asset-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  ASSET_DATA.forEach(item => {
    const tr = document.createElement('tr');
    const badgeClass = item.kondisi === 'Baik' ? 'badge-good' : 'badge-repair';

    tr.innerHTML = `
      <td style="font-weight:600; color:var(--blue);">${item.kode}</td>
      <td style="font-weight:600;">${item.nama}</td>
      <td>${item.kat}</td>
      <td>${item.tgl}</td>
      <td style="font-weight:600;">Rp ${item.beli.toLocaleString('id-ID')}</td>
      <td style="font-weight:700; color:var(--green);">Rp ${item.buku.toLocaleString('id-ID')}</td>
      <td>${item.pj}</td>
      <td><span class="${badgeClass}">${item.kondisi}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

async function initAssetModule() {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('dashboard-content');

  renderAssetTable();

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initAssetModule);
window.pjaxInitDashboard = initAssetModule;
