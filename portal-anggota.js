// --- Portal Mandiri Anggota OPZ Module ---

const OPZ_PROFILES = [
  { id: 'dd', name: 'LAZ Dompet Dhuafa', kelas: 'Kelas A (Rp 5.000.000 / Bulan)', rate: 5000000, paidMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'] },
  { id: 'iz', name: 'LAZ Inisiatif Zakat Indonesia (IZI)', kelas: 'Kelas A (Rp 5.000.000 / Bulan)', rate: 5000000, paidMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei'] },
  { id: 'rZ', name: 'LAZ Rumah Zakat', kelas: 'Kelas A (Rp 5.000.000 / Bulan)', rate: 5000000, paidMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'] },
  { id: 'bsn', name: 'BAZNAS Kota Bandung', kelas: 'Kelas B (Rp 2.500.000 / Bulan)', rate: 2500000, paidMonths: ['Jan', 'Feb', 'Mar'] },
  { id: 'lmi', name: 'LAZ LMI (Lembaga Manajemen Infaq)', kelas: 'Kelas B (Rp 2.500.000 / Bulan)', rate: 2500000, paidMonths: ['Jan', 'Feb', 'Mar', 'Apr'] }
];

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function changeOpzProfile() {
  const select = document.getElementById('opz-select');
  if (!select) return;

  const selectedOpz = OPZ_PROFILES.find(o => o.id === select.value) || OPZ_PROFILES[0];

  document.getElementById('opz-name').textContent = selectedOpz.name;
  document.getElementById('opz-class').innerHTML = `Kelas Kesepakatan Iuran: <strong>${selectedOpz.kelas}</strong>`;

  const totalPaid = selectedOpz.paidMonths.length * selectedOpz.rate;
  document.getElementById('opz-total-paid').textContent = `Rp ${totalPaid.toLocaleString('id-ID')}`;
  document.getElementById('opz-months-status').textContent = `${selectedOpz.paidMonths.length} dari 12 Bulan Terbayar`;

  const grid = document.getElementById('monthly-status-grid');
  if (!grid) return;

  grid.innerHTML = '';
  MONTHS.forEach((m, idx) => {
    const isPaid = idx < selectedOpz.paidMonths.length;
    const card = document.createElement('div');
    card.style.cssText = `background: var(--bg-app, #f8fafc); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px;`;

    card.innerHTML = `
      <div style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">${m.toUpperCase()} 2026</div>
      <div style="margin-top:6px;">
        ${isPaid 
          ? `<span class="month-badge paid"><i class="fas fa-check-circle"></i> LUNAS (Rp ${selectedOpz.rate.toLocaleString('id-ID')})</span>` 
          : `<span class="month-badge unpaid"><i class="fas fa-clock"></i> BELUM BAYAR</span>`}
      </div>
    `;
    grid.appendChild(card);
  });
}

async function initPortalAnggota() {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('dashboard-content');
  const select = document.getElementById('opz-select');

  if (select) {
    select.innerHTML = OPZ_PROFILES.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
  }

  changeOpzProfile();

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initPortalAnggota);
window.pjaxInitDashboard = initPortalAnggota;
