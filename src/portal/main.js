import { commonFetch } from '../lib/utils/fetch.js';
import { getLanguage, setLanguage, expandLanguageResource } from '../lib/core/i18n.js';
import { DataManager } from '../lib/core/dataManager.js';
import portalLocRaw from './portal_loc.json';

/**
 * GameWorks OAK Portal Main Logic
 */

let portalDataManager;

// 多言語展開前の生のデータをキャッシュする変数 (言語変更時の無駄な fetch を防止する共通キャッシュ仕様)
let cachedRawProjectList = null;
const cachedRawProjectInfos = {}; // projectId -> raw project_info
const cachedRawHistories = {};    // projectId -> raw update_history

/**
 * キャッシュデータを完全にクリアします（テスト用・およびデータ強制更新用）
 */
export function clearPortalCache() {
    cachedRawProjectList = null;
    for (const key of Object.keys(cachedRawProjectInfos)) {
        delete cachedRawProjectInfos[key];
    }
    for (const key of Object.keys(cachedRawHistories)) {
        delete cachedRawHistories[key];
    }
}

export async function initPortal() {
    // DataManagerの初期化 (Portal用)
    portalDataManager = new DataManager('portal');

    // 言語プルダウンの初期化
    const selector = document.getElementById('language-selector');
    if (selector) {
        selector.value = getLanguage();
        selector.addEventListener('change', (e) => {
            setLanguage(e.target.value);
            applyPortalLanguage();
            loadProjects();
        });
    }

    // ポータルの共通テキスト適用
    applyPortalLanguage();

    await loadProjects();
    initScrollEffects();
}

function applyPortalLanguage() {
    const loc = expandLanguageResource(portalLocRaw);

    // バージョン表示の設定
    const versionEl = document.getElementById('portal-version');
    if (versionEl) {
        versionEl.textContent = `v${__APP_VERSION__}`;
    }

    // ヒーローサブタイトル
    const heroEl = document.querySelector('.hero p');
    if (heroEl) {
        heroEl.textContent = loc.heroSub;
    }

    // モーダルのデフォルトタイトルも更新
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle && !modalTitle.textContent.includes('-')) {
        modalTitle.textContent = loc.updateHistory;
    }
}

async function loadProjects() {
    const grid = document.getElementById('gamesGrid');
    const loc = expandLanguageResource(portalLocRaw);
    grid.innerHTML = `<div class="LoadingProjects">${loc.loading}</div>`;

    // 1. プロジェクトリストを取得 (キャッシュがあれば再利用、多言語対応)
    if (!cachedRawProjectList) {
        cachedRawProjectList = await commonFetch('data/project_list.json');
    }
    const projects = expandLanguageResource(cachedRawProjectList);

    // 2. 各プロジェクトの詳細データを取得
    const projectData = await Promise.all(projects.map(async project => {
        const id = project.id;
        const title = project.title;
        const baseUrl = `https://t-i-oak.github.io/${id}/`;

        let rawData = cachedRawProjectInfos[id] || null;

        if (!rawData) {
            // リモートの project_info.json からのロードを最優先で試みる
            const remoteInfoUrl = resolveAbsoluteUrl('data/project_info.json', baseUrl);
            try {
                const infoRes = await fetch(remoteInfoUrl);
                if (infoRes.ok) {
                    rawData = await infoRes.json();
                    cachedRawProjectInfos[id] = rawData; // キャッシュに格納
                }
            } catch (e) {
                // ロード失敗時は catch して null のままとする
            }
        }

        let data = null;
        if (rawData) {
            // キャッシュされた生データを、現在の選択言語で展開
            data = expandLanguageResource(rawData);
            data.isMaintenance = false;
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
                tags: loc.maintenanceTags,
                description: loc.maintenanceDesc,
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

            // ロゴのSVGをfetchしてinlining (SVG自体は多言語化されないアセットと仮定し、一度読み込んだら data.logo.content に記憶)
            // もし data.logo.content がまだ fetch されていない場合のみ fetch する
            if (data.logo && data.logo.path && !data.logo.content) {
                const absoluteLogoPath = resolveAbsoluteUrl(data.logo.path, baseUrl);
                data.logo.path = absoluteLogoPath;

                if (isSvgLogoPath(absoluteLogoPath)) {
                    try {
                        const logoRes = await fetch(absoluteLogoPath);
                        if (logoRes.ok) {
                            // 生データ側のロゴキャッシュにコンテンツを格納し、再読み込み時にも引き継げるようにする
                            if (cachedRawProjectInfos[id] && cachedRawProjectInfos[id].logo) {
                                cachedRawProjectInfos[id].logo.content = await logoRes.text();
                            }
                            data.logo.content = cachedRawProjectInfos[id].logo.content;
                        }
                    } catch (e) {
                        // エラーハンドリング
                    }
                }
            } else if (data.logo && cachedRawProjectInfos[id] && cachedRawProjectInfos[id].logo) {
                // キャッシュされているロゴSVGデータを適用
                data.logo.content = cachedRawProjectInfos[id].logo.content;
            }
        }

        return data;
    }));

    renderProjects(projectData.filter(p => p !== null));
}

function renderProjects(projects) {
    const grid = document.getElementById('gamesGrid');
    const loc = expandLanguageResource(portalLocRaw);

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
        } else if (logo && logo.path && isBitmapLogoPath(logo.path)) {
            const logoType = logo.type ? logo.type.charAt(0).toUpperCase() + logo.type.slice(1) : 'Standard';
            logoContentHtml = `<div class="GameLogoWrapper Logo${logoType}"><img class="GameLogoImg" src="${logo.path}" alt="${project.title} logo"></div>`;
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
                        ${loc.updateHistory}
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
    const loc = expandLanguageResource(portalLocRaw);

    modalTitle.textContent = loc.updateHistory; 
    modalBody.innerHTML = `<div class="LoadingSpinner">${loc.loadingHistory}</div>`;
    modalOverlay.classList.add('active');

    try {
        // マニフェストからタイトルを取得
        if (!cachedRawProjectList) {
            cachedRawProjectList = await commonFetch('data/project_list.json');
        }
        const projects = expandLanguageResource(cachedRawProjectList);
        const project = projects.find(p => p.id === projectId);
        const title = project ? project.title : projectId;

        modalTitle.textContent = `${title} - ${loc.updateHistory}`;

        let rawHistory = cachedRawHistories[projectId] || null;

        if (!rawHistory) {
            const baseUrl = `https://t-i-oak.github.io/${projectId}/`;
            const fetchUrl = resolveAbsoluteUrl('data/update_history.json', baseUrl);
            rawHistory = await commonFetch(fetchUrl);
            cachedRawHistories[projectId] = rawHistory; // キャッシュに格納
        }

        // 履歴情報の多言語展開
        const history = expandLanguageResource(rawHistory);
        renderHistory(history, modalBody);
    } catch (e) {
        modalBody.innerHTML = `
            <div class="ModalPlaceholder">
                <p>- ${loc.historyFallback} -</p>
            </div>
        `;
        throw e; // 規約に基づき、開発者が気づけるようコンソールにもエラーを出す
    }
}

function renderHistory(history, container) {
    const loc = expandLanguageResource(portalLocRaw);
    if (!history || history.length === 0) {
        container.innerHTML = `<p>${loc.noHistory}</p>`;
        return;
    }

    const typeLabels = loc.typeLabels;

    container.innerHTML = history.map(item => `
        <div class="HistoryItem">
            <div class="HistoryHeader">
                <span class="HistoryVersion">v${item.version}</span>
                <span class="HistoryDate">${item.date}</span>
            </div>
            <ul class="HistoryChanges">
                ${item.content.map(change => {
                    const label = typeLabels[change.type] || change.type;
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
            cog1.setAttribute('transform', `rotate(${rotation}, 98.002383, 16.425182)`);
        }
        if (cog2) {
            cog2.setAttribute('transform', `rotate(${-rotation}, 124.554465, 34.179775)`);
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
 * @param {string} path 対象 of 相対パスまたは絶対パス
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

function getPathExtension(path) {
    if (!path) return '';

    try {
        return new URL(path, 'https://example.invalid/').pathname.split('.').pop().toLowerCase();
    } catch (e) {
        return path.split(/[?#]/)[0].split('.').pop().toLowerCase();
    }
}

function isSvgLogoPath(path) {
    return getPathExtension(path) === 'svg';
}

function isBitmapLogoPath(path) {
    return ['png', 'jpg', 'jpeg', 'webp'].includes(getPathExtension(path));
}
