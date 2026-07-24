// --- PSAK 45 / ISAK 35 Financial Module ---

function switchPsakTab(tab) {
  const btnBalance = document.getElementById('tab-balance');
  const btnAct = document.getElementById('tab-activities');
  const panelBalance = document.getElementById('psak-panel-balance');
  const panelAct = document.getElementById('psak-panel-activities');

  if (tab === 'balance') {
    btnBalance.classList.add('active');
    btnAct.classList.remove('active');
    panelBalance.style.display = 'block';
    panelAct.style.display = 'none';
  } else {
    btnAct.classList.add('active');
    btnBalance.classList.remove('active');
    panelAct.style.display = 'block';
    panelBalance.style.display = 'none';
  }
}

async function initPsak45() {
  const loading = document.getElementById('loading-state');
  const content = document.getElementById('dashboard-content');
  const dateSelect = document.getElementById('psak-date-select');

  if (dateSelect) {
    dateSelect.innerHTML = '<option value="latest">23 Juni 2026</option><option value="prev">21 Mei 2026</option>';
  }

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initPsak45);
window.pjaxInitDashboard = initPsak45;
