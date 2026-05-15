import { commonFetch } from '../common/utils/fetch.js';

/**
 * GameWorks OAK Portal Main Logic
 */

export async function initPortal() {
    await loadProjects();
    initScrollEffects();
}

async function loadProjects() {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">Loading projects...</div>';

    try {
        // 1. プロジェクトリストを取得
        const projectIds = await commonFetch('data/project_list.json');

        // 2. 各プロジェクトの詳細データを取得
        const projectData = await Promise.all(projectIds.map(async id => {
            try {
                const data = await commonFetch(`data/projects/${id}.json`);
                data.id = id;

                // 3. ロゴのSVGをfetchしてinlining
                if (data.logo && data.logo.path) {
                    try {
                        const logoRes = await fetch(data.logo.path);
                        if (logoRes.ok) {
                            data.logo.content = await logoRes.text();
                        }
                    } catch (e) {
                        console.warn(`Failed to inline logo for ${id}:`, e);
                    }
                }
                return data;
            } catch (e) {
                console.error(`Failed to load project data for ${id}:`, e);
                return null;
            }
        }));

        renderProjects(projectData.filter(p => p !== null));
    } catch (error) {
        console.error("Critical error loading projects:", error);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--secondary);">データの読み込みに失敗しました。</div>';
    }
}

function renderProjects(projects) {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = projects.map((project, index) => {
        const logoHtml = project.logo.content 
            ? `<div class="game-logo-wrapper" style="--logo-height: ${project.logo.style.height || '40px'}; ${Object.entries(project.logo.style).filter(([k]) => k !== 'height').map(([k,v]) => `${k}:${v}`).join(';')}">${project.logo.content}</div>`
            : `<h3>${project.title}</h3>`;

        const btn = project.button;
        const status = project.status;

        return `
        <div class="game-card animate-fade" style="--delay: ${0.2 * (index + 1)}s">
            <div class="game-img" style="--bg-image: url('${project.image}')">
                <div class="game-title-overlay">
                    ${logoHtml}
                </div>
                <span class="badge" style="${Object.entries(status.style || {}).map(([k,v]) => `${k}:${v}`).join(';')}">${status.content}</span>
            </div>
            <div class="game-info">
                <div class="tags">
                    ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <p>${project.description}</p>
                <div class="btn-group" style="flex-direction: column; align-items: stretch; gap: 0.5rem;">
                    <button class="history-link" style="align-self: flex-end; margin-bottom: 0.2rem;" data-project-id="${project.id}">Update History</button>
                    <a href="${btn.disabled ? 'javascript:void(0)' : btn.url}" 
                       class="btn-more ${btn.disabled ? 'disabled' : ''}" 
                       ${btn.disabled ? 'onclick="return false;"' : ''}
                       style="${Object.entries(btn.style || {}).map(([k,v]) => `${k}:${v}`).join(';')}">
                       ${btn.content}
                    </a>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // イベントリスナーの付与
    grid.querySelectorAll('.history-link').forEach(btn => {
        btn.addEventListener('click', () => showHistory(btn.dataset.projectId));
    });

    initObserver();
}

function initObserver() {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-fade').forEach(el => {
        observer.observe(el);
    });
}

// Modal Logic
async function showHistory(projectId) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = `Update History`; 
    modalBody.innerHTML = '<div class="loading-spinner">Loading history...</div>';
    modalOverlay.classList.add('active');

    try {
        const project = await commonFetch(`data/projects/${projectId}.json`);
        modalTitle.textContent = `${project.title} - Update History`;

        const baseUrl = project.button.url.endsWith('/') ? project.button.url : project.button.url + '/';
        const fetchUrl = project.button.url.includes('.json') ? project.button.url : baseUrl + 'update_history.json';
        
        const history = await commonFetch(fetchUrl);
        renderHistory(history, modalBody);
    } catch (error) {
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <p>現在、更新履歴は公開されていません。</p>
                <p style="font-size: 0.8rem; margin-top: 1rem;">(${error.message})</p>
            </div>
        `;
    }
}

function renderHistory(history, container) {
    if (!history || history.length === 0) {
        container.innerHTML = '<p>No history available.</p>';
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-header">
                <span class="history-version">v${item.version}</span>
                <span class="history-date">${item.date}</span>
            </div>
            <div class="history-title">${item.title}</div>
            ${item.description ? `<p style="margin-bottom: 0.5rem; font-size: 0.9rem;">${item.description}</p>` : ''}
            <ul class="history-changes">
                ${item.changes.map(change => `<li>${change}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

// Scroll Effects
function initScrollEffects() {
    const header = document.querySelector('header');
    const cog1 = document.getElementById('logo-cog-1');
    const cog2 = document.getElementById('logo-cog-2');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Header shrink
        if (scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Cog rotation
        const rotation = scrollY * 0.5;
        if (cog1) {
            cog1.setAttribute('transform', `rotate(${rotation}, 110.72, 23.20)`);
        }
        if (cog2) {
            cog2.setAttribute('transform', `matrix(0.17386665, 0.04658743, -0.04658743, 0.17386665, 124.54416, 18.909185) rotate(${-rotation}, 100, 100)`);
        }
    });

    // Modal Close Events
    modalClose.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('active');
    });
}
