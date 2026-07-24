// --- Nota Dinas & Digital Approval Module ---

const NOTA_DINAS_DATA = [
  { no: 'ND-2026/001', tgl: '15 Jan 2026', perihal: 'Sewa Ruang Sekretariat FOZ 2026 Q1', nominal: 35000000, bidang: 'Sekretariat', status: 'approved' },
  { no: 'ND-2026/002', tgl: '22 Jan 2026', perihal: 'Honorarium Staf Operasional Sekretariat', nominal: 18500000, bidang: 'Sekretariat', status: 'approved' },
  { no: 'ND-2026/003', tgl: '04 Feb 2026', perihal: 'Advokasi Harmonisasi RUU Zakat ke Kemenag', nominal: 12000000, bidang: 'Advokasi', status: 'approved' },
  { no: 'ND-2026/004', tgl: '18 Feb 2026', perihal: 'Pelatihan Sertifikasi Manajemen Amil LAZ', nominal: 25000000, bidang: 'Kapasitas', status: 'approved' },
  { no: 'ND-2026/005', tgl: '01 Mar 2026', perihal: 'Pengadaan Server & Infrastructure IT', nominal: 14200000, bidang: 'Sekretariat', status: 'approved' },
  { no: 'ND-2026/006', tgl: '12 Mar 2026', perihal: 'Sosialisasi Kurban Nasional OPZ 1447 H', nominal: 15500000, bidang: 'Keanggotaan', status: 'approved' },
  { no: 'ND-2026/007', tgl: '05 Apr 2026', perihal: 'Operational Support Rakernas FOZ 2026', nominal: 45000000, bidang: 'Sekretariat', status: 'approved' },
  { no: 'ND-2026/008', tgl: '20 Apr 2026', perihal: 'Konsolidasi Wilayah LAZ Sumatra & Jawa', nominal: 9800000, bidang: 'Keanggotaan', status: 'approved' },
  { no: 'ND-2026/009', tgl: '10 Mei 2026', perihal: 'Audit Akuntabilitas NPO & Legal FOZ', nominal: 22000000, bidang: 'Advokasi', status: 'approved' },
  { no: 'ND-2026/010', tgl: '15 Mei 2026', perihal: 'Workshop Manajemen Risiko Organisasi Zakat', nominal: 10500000, bidang: 'Kapasitas', status: 'pending' },
  { no: 'ND-2026/011', tgl: '18 Mei 2026', perihal: 'Pengadaan Souvenir & Media Kit Anggota FOZ', nominal: 5000000, bidang: 'Keanggotaan', status: 'pending' }
];

function renderNdTable(data = NOTA_DINAS_DATA) {
  const tbody = document.getElementById('nd-table-body');
  const countEl = document.getElementById('nd-table-count');

  if (!tbody) return;

  tbody.innerHTML = '';
  if (countEl) countEl.textContent = `Showing ${data.length} Items`;

  data.forEach(item => {
    const tr = document.createElement('tr');
    let statusBadge = '';
    if (item.status === 'approved') {
      statusBadge = '<span class="badge-approved"><i class="fas fa-check-circle"></i> Disetujui & Dicairkan</span>';
    } else if (item.status === 'pending') {
      statusBadge = '<span class="badge-pending"><i class="fas fa-clock"></i> Pending Approval</span>';
    } else {
      statusBadge = '<span class="badge-rejected"><i class="fas fa-times-circle"></i> Ditolak</span>';
    }

    tr.innerHTML = `
      <td style="font-weight:600; color:var(--blue);">${item.no}</td>
      <td>${item.tgl}</td>
      <td style="font-weight:600;">${item.perihal}</td>
      <td style="font-weight:700;">Rp ${item.nominal.toLocaleString('id-ID')}</td>
      <td>${item.bidang}</td>
      <td>${statusBadge}</td>
      <td style="text-align:center;">
        <button style="border:none; background:transparent; color:var(--blue); cursor:pointer;" title="Lihat Detail"><i class="fas fa-eye"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterNdTable() {
  const val = document.getElementById('nd-filter-select').value;
  if (val === 'all') {
    renderNdTable(NOTA_DINAS_DATA);
  } else {
    renderNdTable(NOTA_DINAS_DATA.filter(x => x.status === val));
  }
}

function openNdModal() {
  const modal = document.getElementById('nd-modal');
  if (modal) modal.style.display = 'flex';
}

function closeNdModal() {
  const modal = document.getElementById('nd-modal');
  if (modal) modal.style.display = 'none';
}

function submitNd(e) {
  e.preventDefault();
  const perihal = document.getElementById('nd-perihal').value;
  const bidang = document.getElementById('nd-bidang').value;
  const nominal = parseInt(document.getElementById('nd-nominal').value) || 0;

  const newNo = `ND-2026/0${NOTA_DINAS_DATA.length + 1}`;
  const today = '25 Jul 2026';

  NOTA_DINAS_DATA.unshift({
    no: newNo,
    tgl: today,
    perihal,
    nominal,
    bidang,
    status: 'pending'
  });

  renderNdTable();
  closeNdModal();
  alert(`Pengajuan Nota Dinas ${newNo} berhasil dibuat dan masuk antrean approval!`);
}

async function initNdModule() {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('dashboard-content');

  renderNdTable();

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initNdModule);
window.pjaxInitDashboard = initNdModule;
