// sidebar.js untuk ERP (Admin / Executive)
(function() {
    // 1. Inject skeleton immediately so sidebar never "disappears"
    function injectSkeleton() {
        const container = document.getElementById('sidebar-container');
        if (!container || container.dataset.injected) return;
        
        container.dataset.injected = 'true';
        container.innerHTML = `
            <div class="rotate-screen-warning">
                <i class="fas fa-mobile-alt"></i>
                <h2>Mohon Putar Perangkat Anda</h2>
                <p>Dashboard Keuangan menampilkan banyak tabel data. Silakan putar layar HP Anda (Landscape) atau buka di Laptop/PC untuk pengalaman terbaik.</p>
            </div>
            <div class="mobile-header">
                <button id="mobile-menu-btn" class="menu-btn"><i class="fas fa-bars"></i></button>
                <div class="mobile-logo">KEUANGAN FOZ</div>
            </div>
            <aside class="sidebar collapsed" id="main-sidebar">
                <div class="sidebar-logo">
                    <button id="desktop-menu-btn" class="menu-btn"><i class="fas fa-bars"></i></button>
                    <span style="display: flex; flex-direction: column; justify-content: center; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; white-space: nowrap; margin-left: 10px;">
                        KEUANGAN FOZ
                    </span>
                </div>
                <div id="sidebar-menu-container"></div>
                <div style="flex-grow: 1;"></div>
            </aside>
        `;
        
        // Setup events immediately on the skeleton
        initSidebarEvents();
    }

    function renderMenu() {
        // Mock user role to allow rendering without auth.js
        const user = window.HAZANA_USER || { role: 'SUPER_ADMIN' };

        const isSubFolder = window.location.pathname.split('/').some(p => ['admin', 'member', 'sekretariat', 'executive', 'unit-layanan-1', 'monitoring-program'].includes(p));
        const base = isSubFolder ? '../' : './';

        // Inject Phosphor Icons if not present
        if (!document.getElementById('phosphor-icons')) {
            const phScript = document.createElement('script');
            phScript.id = 'phosphor-icons';
            phScript.src = 'https://unpkg.com/@phosphor-icons/web';
            document.head.appendChild(phScript);
        }

        const path = window.location.pathname;

        let menuHTML = '';

        // Determine context based on path
        if (path.includes('/unit-layanan-1/')) {
            menuHTML = `
                <ul class="sidebar-menu">
                    <li><a href="${base}unit-layanan-1/iuran-anggota.html"><i class="ph-light ph-file-text"></i> <span>Iuran Anggota</span></a></li>
                </ul>
            `;
        } else if (path.includes('/sekretariat/')) {
            menuHTML = `
                <div class="menu-label">SEKRETARIAT FOZ</div>
                <ul class="sidebar-menu">
                    <li><a href="${base}sekretariat/dashboard.html"><i class="ph-light ph-identification-card"></i> <span>Data Keanggotaan</span></a></li>
                </ul>
            `;
        } else if (path.includes('/monitoring-program/')) {
            menuHTML = `
                <div style="padding: 12px 20px 8px 20px; font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.45); letter-spacing: 0.8px; text-transform: uppercase;">MONITORING PROGRAM</div>
                <ul class="sidebar-menu">
                    <li><a href="${base}monitoring-program/program.html"><i class="ph-light ph-kanban"></i> <span>Program Kerja</span></a></li>
                    <li><a href="${base}monitoring-program/timeline.html"><i class="ph-light ph-calendar-blank"></i> <span>Timeline Event</span></a></li>
                </ul>
                <div style="position: absolute; bottom: 20px; left: 0; width: 100%; padding: 0 15px;">
                    <a href="${base}dashboard.html" style="display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,0.7); text-decoration: none; font-size: 0.82rem; font-weight: 600; padding: 10px 15px; border-radius: 8px; margin-bottom: 8px; background: rgba(255,255,255,0.08); transition: background 0.2s;">
                        <i class="ph-light ph-arrow-left" style="min-width: 24px; text-align: center; font-size: 1.1rem;"></i> <span class="sidebar-text">Kembali ke Keuangan</span>
                    </a>
                    <a href="#" onclick="sessionStorage.removeItem('foz_auth'); window.location.href='${base}login.html';" style="display: flex; align-items: center; gap: 15px; color: #ef4444; text-decoration: none; font-weight: 600; font-size: 0.9rem; padding: 12px 15px; border-radius: 8px; transition: background 0.2s;">
                        <i class="ph-light ph-sign-out" style="min-width: 24px; text-align: center; font-size: 1.1rem;"></i> <span class="sidebar-text">Keluar</span>
                    </a>
                </div>
            `;
        } else if (path.includes('/admin/')) {
            // Default Admin Menu for /admin/
            menuHTML = `
                <ul class="sidebar-menu">
                    <li><a href="${base}admin/lembaga.html"><i class="fas fa-building"></i> <span>Lembaga</span></a></li>
                    <li><a href="${base}admin/dashboard.html"><i class="fas fa-users-cog"></i> <span>Akun</span></a></li>
                    <li><a href="${base}admin/portal.html"><i class="fas fa-th-large"></i> <span>Modul</span></a></li>
                </ul>
            `;
        } else {
             menuHTML = `
                 <ul class="sidebar-menu">
                     <li><a href="${base}dashboard.html"><i class="ph-light ph-squares-four"></i> <span>Ringkasan Umum</span></a></li>
                     <li><a href="${base}kas-komprehensif.html"><i class="ph-light ph-wallet"></i> <span>Kas & Bank</span></a></li>
                     <li><a href="${base}kas-foz.html"><i class="ph-light ph-receipt"></i> <span>Realisasi Anggaran</span></a></li>
                     <li><a href="${base}pendapatan-iuran.html"><i class="ph-light ph-hand-coins"></i> <span>Pendapatan & Iuran</span></a></li>
                     <li><a href="${base}nota-dinas.html"><i class="ph-light ph-file-text"></i> <span>Nota Dinas</span></a></li>
                     <li><a href="${base}cashbon.html"><i class="ph-light ph-money"></i> <span>Uang Muka & LPJ</span></a></li>
                     <li><a href="${base}aset.html"><i class="ph-light ph-archive"></i> <span>Aset & Inventaris</span></a></li>
                     <li><a href="${base}utang-vendor.html"><i class="ph-light ph-handshake"></i> <span>Utang & Piutang Mitra</span></a></li>
                     <li><a href="${base}psak45.html"><i class="ph-light ph-file-doc"></i> <span>Laporan PSAK 45</span></a></li>
                     <li><a href="${base}arus-kas.html"><i class="ph-light ph-arrows-left-right"></i> <span>Laporan Arus Kas</span></a></li>
                     <li><a href="${base}calk.html"><i class="ph-light ph-book-open"></i> <span>CALK PSAK 45</span></a></li>
                     <li><a href="${base}portal-anggota.html"><i class="ph-light ph-buildings"></i> <span>Portal Anggota</span></a></li>
                     
                     <li style="margin-top: 12px; margin-bottom: 4px; padding-left: 20px; font-size: 0.68rem; font-weight: 700; color: rgba(255,255,255,0.45); letter-spacing: 0.8px; text-transform: uppercase;">MONITORING PROGRAM</li>
                     <li><a href="${base}monitoring-program/program.html"><i class="ph-light ph-kanban"></i> <span>Program Kerja</span></a></li>
                     <li><a href="${base}monitoring-program/timeline.html"><i class="ph-light ph-calendar-blank"></i> <span>Timeline Event</span></a></li>
                 </ul>
                 <div style="position: absolute; bottom: 20px; left: 0; width: 100%; padding: 0 15px;">
                     <a href="#" onclick="sessionStorage.removeItem('foz_auth'); window.location.href='${base}login.html';" style="display: flex; align-items: center; gap: 15px; color: #ef4444; text-decoration: none; font-weight: 600; font-size: 0.9rem; padding: 12px 15px; border-radius: 8px; transition: background 0.2s;">
                         <i class="ph-light ph-sign-out" style="min-width: 24px; text-align: center; font-size: 1.1rem;"></i> <span class="sidebar-text">Keluar</span>
                     </a>
                 </div>
            `;
        }

        // Removed portal link for cleanliness

        const menuContainer = document.getElementById('sidebar-menu-container');
        if (menuContainer) {
            menuContainer.innerHTML = menuHTML;
        }

        // Set active menu based on current URL
        let currentFile = window.location.pathname.split('/').pop() || 'dashboard.html';
        if (currentFile === 'index.html' || !currentFile) currentFile = 'dashboard.html'; // Alias index.html to dashboard
        
        let foundActive = false;
        document.querySelectorAll('.sidebar-menu a').forEach(a => {
            const href = a.getAttribute('href');
            if (href && href.endsWith(currentFile) && !foundActive) {
                a.parentElement.classList.add('active');
                foundActive = true;
            }
            
            // PJAX Navigation Intercept
            a.addEventListener('click', async (e) => {
                const targetHref = a.getAttribute('href');
                if (!targetHref || targetHref === '#' || targetHref.startsWith('javascript:') || a.getAttribute('target') === '_blank') return;
                
                e.preventDefault();
                
                const sidebar = document.getElementById('main-sidebar');
                if (window.innerWidth <= 768 && sidebar) {
                    sidebar.classList.remove('open');
                }

                const currentMc = document.querySelector('.main-content');
                if (currentMc) currentMc.classList.add('page-fade-out');

                // Update active menu visually
                document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
                a.parentElement.classList.add('active');

                setTimeout(async () => {
                    try {
                        const urlWithCb = targetHref.includes('?') ? `${targetHref}&_cb=${Date.now()}` : `${targetHref}?_cb=${Date.now()}`;
                        const res = await fetch(urlWithCb, { cache: 'no-cache' });
                        const html = await res.text();
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        
                        // Replace main content
                        const newMc = doc.querySelector('.main-content');
                        if (newMc && currentMc) {
                            const importedMc = document.importNode(newMc, true);
                            currentMc.replaceWith(importedMc);
                            importedMc.classList.remove('page-fade-out');
                        }
                        
                        // Replace modals (if any)
                        const currentModals = document.querySelectorAll('.modal');
                        currentModals.forEach(m => m.remove());
                        const newModals = doc.querySelectorAll('.modal');
                        newModals.forEach(m => document.body.appendChild(m));
                        
                        // Replace internal styles
                        const currentStyles = document.querySelectorAll('style');
                        currentStyles.forEach(s => s.remove());
                        const newStyles = doc.querySelectorAll('style');
                        newStyles.forEach(s => document.head.appendChild(document.importNode(s, true)));
                        
                        document.title = doc.title;
                        document.body.className = doc.body.className;
                        window.history.pushState({}, '', targetHref);
                        
                        window.pjaxInitDashboard = null;
                        
                        // Execute Scripts outside main content (specifically core JS)
                        const scripts = doc.querySelectorAll('script');
                        let scriptsToLoad = [];
                        const existingScripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
                        scripts.forEach(oldScript => {
                            if (oldScript.src && !oldScript.src.includes('sidebar.js') && !oldScript.src.includes('auth.js') && !oldScript.src.includes('supabase-config.js')) {
                                // Only load script if it's not already in the document (avoids reloading Chart.js etc)
                                if (!existingScripts.includes(oldScript.src) || oldScript.src.includes('pendapatan-iuran.js') || oldScript.src.includes('kas-foz.js') || oldScript.src.includes('kas-komprehensif.js') || oldScript.src.includes('psak45.js') || oldScript.src.includes('nota-dinas.js')) {
                                    scriptsToLoad.push(oldScript.src);
                                }
                            }
                        });
                        
                        const finishPjax = () => {
                            window.dispatchEvent(new CustomEvent('hazana:pjax-loaded'));
                            if (typeof window.pjaxInitDashboard === 'function') {
                                window.pjaxInitDashboard();
                            }
                        };
                        
                        if (scriptsToLoad.length > 0) {
                            let loadedCount = 0;
                            const cacheBuster = new Date().getTime();
                            scriptsToLoad.forEach(src => {
                                const s = document.createElement('script');
                                s.src = src.includes('?') ? `${src}&v=${cacheBuster}` : `${src}?v=${cacheBuster}`;
                                s.onload = s.onerror = () => {
                                    loadedCount++;
                                    if (loadedCount === scriptsToLoad.length) {
                                        finishPjax();
                                    }
                                };
                                document.body.appendChild(s);
                            });
                        } else {
                            finishPjax();
                        }
                        
                    } catch (error) {
                        console.error('PJAX Error:', error);
                        window.location.href = targetHref;
                    }
                }, 150);
            });
        });
    }

    function initSidebarEvents() {
        const sidebar = document.getElementById('main-sidebar');
        const desktopBtn = document.getElementById('desktop-menu-btn');
        const mobileBtn = document.getElementById('mobile-menu-btn');
        
        const savedState = localStorage.getItem('sidebarState');
        if (savedState === 'expanded' && window.innerWidth > 768) {
            sidebar.classList.remove('collapsed');
            updateMainContentState();
        }

        if (desktopBtn && mobileBtn && sidebar) {
            desktopBtn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                } else {
                    sidebar.classList.toggle('collapsed');
                    updateMainContentState();
                    const isCollapsed = sidebar.classList.contains('collapsed');
                    localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded');
                }
            });

            mobileBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
    }

    function updateMainContentState() {
        const activeMc = document.querySelector('.main-content');
        const sidebar = document.getElementById('main-sidebar');
        if (activeMc && sidebar) {
            if (sidebar.classList.contains('collapsed')) {
                activeMc.classList.add('expanded');
            } else {
                activeMc.classList.remove('expanded');
            }
        }
    }

    // Inject skeleton synchronously if possible
    injectSkeleton();

    document.addEventListener('DOMContentLoaded', () => {
        injectSkeleton(); // In case container wasn't ready earlier
        renderMenu();
    });
})();
