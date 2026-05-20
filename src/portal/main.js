import { commonFetch } from '../lib/utils/fetch.js';

/**
 * GameWorks OAK Portal Main Logic
 */

export async function initPortal() {
    // バージョン表示の設定
    const versionEl = document.getElementById('portal-version');
    if (versionEl) {
        versionEl.textContent = `v${__APP_VERSION__}`;
    }

    await loadProjects();
    initScrollEffects();
}

async function loadProjects() {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">Loading projects...</div>';

    // 1. プロジェクトリストを取得 (id, title のオブジェクト配列)
    const projects = await commonFetch('data/project_list.json');

    // 2. 各プロジェクトの詳細データを取得
    const projectData = await Promise.all(projects.map(async project => {
        const id = project.id;
        const title = project.title;
        const baseUrl = `https://t-i-oak.github.io/${id}/`;

        let data = null;

        // リモートの project_info.json からのロードを最優先で試みる
        const remoteInfoUrl = resolveAbsoluteUrl('data/project_info.json', baseUrl);
        try {
            const infoRes = await fetch(remoteInfoUrl);
            if (infoRes.ok) {
                data = await infoRes.json();
                data.isMaintenance = false;
            }
        } catch (e) {
            // ロード失敗時は catch して null のままとする
        }

        // ロードに失敗した（準備中やネットワークエラー等）場合は簡易表示モードにする
        if (!data) {
            data = {
                id: id,
                title: title,
                isMaintenance: true,
                image: '',
                badge: {
                    content: '',
                    type: 'none'
                },
                tags: ['データ取得不可'],
                description: 'プロジェクト情報の取得に失敗しました。一時的なメンテナンス中か、ネットワーク環境に問題がある可能性があります。',
                button: {
                    content: 'UNAVAILABLE',
                    url: 'javascript:void(0)',
                    type: 'pending'
                }
            };
        } else {
            // ロード成功時の共通初期化
            data.id = id;
            if (!data.button) {
                data.button = { url: baseUrl, content: 'PLAY NOW', type: 'published' };
            } else if (!data.button.url) {
                data.button.url = baseUrl;
            }

            // サムネイル画像の相対URLを絶対URLに解決
            if (data.image) {
                data.image = resolveAbsoluteUrl(data.image, baseUrl);
            }

            // ロゴのSVGをfetchしてinlining
            if (data.logo && data.logo.path) {
                const absoluteLogoPath = resolveAbsoluteUrl(data.logo.path, baseUrl);
                const logoRes = await fetch(absoluteLogoPath);
                if (logoRes.ok) {
                    data.logo.content = await logoRes.text();
                }
            }
        }

        return data;
    }));

    renderProjects(projectData.filter(p => p !== null));
}

function renderProjects(projects) {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = projects.map((project, index) => {
        const logo = project.logo;
        const badge = project.badge;
        const button = project.button;
        const isMaintenance = project.isMaintenance;

        // ロゴのHTML生成
        let logoContentHtml = '';
        if (logo && logo.content) {
            const logoType = logo.type ? logo.type.charAt(0).toUpperCase() + logo.type.slice(1) : 'Standard';
            logoContentHtml = `<div class="GameLogoWrapper Logo${logoType}">${logo.content}</div>`;
        } else {
            logoContentHtml = `<div class="GameLogoWrapper LogoText"><h3>${project.title}</h3></div>`;
        }

        // ボタンの無効化判定（pending または maintenance の場合はクリック不可にする）
        const isPending = button.type === 'pending' || isMaintenance;
        const buttonUrl = isPending ? 'javascript:void(0)' : button.url;
        const buttonAttr = isPending ? 'onclick="return false;"' : '';

        return `
        <div class="GameCard ${isMaintenance ? 'state-maintenance' : ''} animate-fade" style="--delay: ${0.2 * (index + 1)}s">
            <div class="GameImg" style="--bg-image: url('${project.image}')">
                <div class="GameTitleOverlay">
                    ${logoContentHtml}
                </div>
                <span class="badge texture-${badge.type}">${badge.content}</span>
            </div>
            <div class="GameInfo">
                <div class="tags">
                    ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <p>${project.description}</p>
                <div class="BtnGroup">
                    <button class="HistoryLink" 
                            data-project-id="${project.id}"
                            ${isMaintenance ? 'disabled' : ''}>
                        Update History
                    </button>
                    <a href="${buttonUrl}" 
                       class="BtnMore state-${button.type}" 
                       ${!isPending ? 'target="_blank" rel="noopener noreferrer"' : ''}
                       ${buttonAttr}>
                       ${button.content}
                    </a>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // イベントリスナーの付与
    grid.querySelectorAll('.HistoryLink').forEach(btn => {
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
export async function showHistory(projectId) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = `Update History`; 
    modalBody.innerHTML = '<div class="LoadingSpinner">Loading history...</div>';
    modalOverlay.classList.add('active');

    try {
        // マニフェストからタイトルを取得
        const projects = await commonFetch('data/project_list.json');
        const project = projects.find(p => p.id === projectId);
        const title = project ? project.title : projectId;

        modalTitle.textContent = `${title} - Update History`;

        const baseUrl = `https://t-i-oak.github.io/${projectId}/`;
        const fetchUrl = resolveAbsoluteUrl('data/update_history.json', baseUrl);
        
        const history = await commonFetch(fetchUrl);
        renderHistory(history, modalBody);
    } catch (e) {
        modalBody.innerHTML = `
            <div class="ModalPlaceholder">
                <p>- 準備中 -</p>
            </div>
        `;
        throw e; // 規約に基づき、開発者が気づけるようコンソールにもエラーを出す
    }
}

function renderHistory(history, container) {
    if (!history || history.length === 0) {
        container.innerHTML = '<p>No history available.</p>';
        return;
    }

    const typeLabels = {
        new: '新機能',
        imp: '改善',
        fix: '修正',
        etc: 'その他'
    };

    container.innerHTML = history.map(item => `
        <div class="HistoryItem">
            <div class="HistoryHeader">
                <span class="HistoryVersion">v${item.version}</span>
                <span class="HistoryDate">${item.date}</span>
            </div>
            <ul class="HistoryChanges">
                ${item.content.map(change => {
                    const label = typeLabels[change.type];
                    return `<li><span class="HistoryTag tag-${change.type}">${label}</span>${change.text}</li>`;
                }).join('')}
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

/**
 * ロゴSVGなどのパスを、プロジェクトのベースURLを基準とする動的絶対パスに変換する
 * @param {string} path 対象の相対パスまたは絶対パス
 * @param {string} baseUrl 基準とするベースURL
 * @returns {string} 解決された絶対パス
 */
export function resolveAbsoluteUrl(path, baseUrl) {
    if (!path) return '';
    
    // すでに絶対URLである場合はそのまま返す
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // baseUrl が指定されていない場合は path をそのまま返す
    if (!baseUrl) return path;

    // baseUrl の末尾スラッシュ処理
    let base = baseUrl;
    if (!base.endsWith('/')) {
        try {
            const urlObj = new URL(base);
            const pathname = urlObj.pathname;
            // 最後のセグメントを取得
            const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1);
            // 最後のセグメントにドットが含まれていない（ファイル名ではない＝ディレクトリである）場合は、末尾にスラッシュを補完
            if (!lastSegment.includes('.')) {
                base = base + '/';
            }
        } catch (e) {
            // URLとして解析できない場合はスラッシュを補完しない
        }
    }

    try {
        return new URL(path, base).href;
    } catch (e) {
        // 解析エラー時のフォールバック
        return path;
    }
}
