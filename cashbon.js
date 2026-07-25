// --- LPJ & Cashbon Kegiatan Module ---

const CASHBON_DATA = [
  { no: 'CB-2026/001', tgl: '10 Feb 2026', perihal: 'Uang Muka Tim Konsolidasi Wilayah Jawa', pemohon: 'Bidang Keanggotaan', nominal: 12000000, deadline: '24 Feb 2026', status: 'Lunas LPJ' },
  { no: 'CB-2026/002', tgl: '18 Mar 2026', perihal: 'Beban Operasional Pelatihan Sertifikasi Amil', pemohon: 'Bidang Kapasitas', nominal: 25000000, deadline: '01 Apr 2026', status: 'Lunas LPJ' },
  { no: 'CB-2026/003', tgl: '02 Apr 2026', perihal: 'Uang Muka Press Conference & Media Gathering', pemohon: 'Sekretariat', nominal: 8500000, deadline: '16 Apr 2026', status: 'Lunas LPJ' },
  { no: 'CB-2026/004', tgl: '15 Mei 2026', perihal: 'Perjalanan Dinas Tim Advokasi ke DPR/Kemenag', pemohon: 'Bidang Advokasi', nominal: 6500000, deadline: '29 Mei 2026', status: 'Pending LPJ' },
  { no: 'CB-2026/005', tgl: '01 Jun 2026', perihal: 'DP Sewa Venue Rakernas FOZ 2026', pemohon: 'Sekretariat', nominal: 10000000, deadline: '15 Jun 2026', status: 'Pending LPJ' }
];

function renderCashbonTable() {
  const tbody = document.getElementById('cb-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  CASHBON_DATA.forEach(item => {
    const tr = document.createElement('tr');
    const badgeClass = item.status === 'Lunas LPJ' ? 'badge-lunas' : 'badge-pending';

    tr.innerHTML = `
      <td style="font-weight:600; color:var(--blue);">${item.no}</td>
      <td>${item.tgl}</td>
      <td style="font-weight:600;">${item.perihal}</td>
      <td>${item.pemohon}</td>
      <td style="font-weight:700;">Rp ${item.nominal.toLocaleString('id-ID')}</td>
      <td>${item.deadline}</td>
      <td><span class="${badgeClass}">${item.status}</span></td>
      <td style="text-align:center;">
        <button onclick="alert('Upload / Verifikasi Berkas LPJ ${item.no}')" style="border:none; background:rgba(59,130,246,0.1); color:var(--blue); padding:4px 10px; border-radius:6px; font-size:0.78rem; cursor:pointer; font-weight:600;">
          <i class="fas fa-file-arrow-up"></i> Detail LPJ
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function initCashbonModule() {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('dashboard-content');

  renderCashbonTable();

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initCashbonModule);
window.pjaxInitDashboard = initCashbonModule;
