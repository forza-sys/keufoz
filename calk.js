// --- Catatan atas Laporan Keuangan (CALK) PSAK 45 Module ---

async function initCalkModule() {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('dashboard-content');

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initCalkModule);
window.pjaxInitDashboard = initCalkModule;
