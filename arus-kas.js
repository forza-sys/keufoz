// --- Laporan Arus Kas (Cash Flow Statement) Module ---

async function initArusKasModule() {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('dashboard-content');

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initArusKasModule);
window.pjaxInitDashboard = initArusKasModule;
