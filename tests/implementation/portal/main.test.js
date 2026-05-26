import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initPortal, showHistory, resolveAbsoluteUrl, getBadgeClassName, isBadgeFeatured } from '../../../src/portal/main.js';
import { clearL10nCache } from '../../../src/lib/core/i18n.js';

// localStorage の共通モック
const mockStore = {};
const localStorageMock = {
    getItem: vi.fn((key) => mockStore[key] || null),
    setItem: vi.fn((key, value) => { mockStore[key] = String(value); }),
    removeItem: vi.fn((key) => { delete mockStore[key]; }),
    clear: vi.fn(() => { for (let key in mockStore) delete mockStore[key]; })
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true, writable: true });

// DOM のモック
document.body.innerHTML = `
    <header>
        <select id="language-selector">
            <option value="ja">日本語</option>
            <option value="en">English</option>
        </select>
    </header>
    <div id="portal-version"></div>
    <div id="gamesGrid"></div>
    <svg>
        <g id="logo-cog-1"></g>
        <g id="logo-cog-2"></g>
    </svg>
    <div id="modalOverlay">
        <div id="modalTitle"></div>
        <div id="modalBody"></div>
        <button id="modalClose"></button>
    </div>
    <main class="Container"><p></p></main>
`;

// commonFetch のモックが必要だが、main.js で import されているので vi.mock を使う
vi.mock('../../../src/lib/utils/fetch.js', () => ({
    commonFetch: vi.fn()
}));

import { commonFetch } from '../../../src/lib/utils/fetch.js';

describe('portal main.js - showHistory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        clearL10nCache();
        // showHistory用の最小限のDOMを設定
        document.body.innerHTML = `
            <select id="language-selector">
                <option value="ja">日本語</option>
                <option value="en">English</option>
            </select>
            <div id="modalOverlay">
                <div id="modalTitle"></div>
                <div id="modalBody"></div>
                <button id="modalClose"></button>
            </div>
            <main class="Container"><p></p></main>
        `;
    });

    it('should fetch update_history.json directly from standard remote path using manifest title', async () => {
        const projectId = 'BurstCascade';
        const manifestData = [
            { id: 'BurstCascade', title: 'Burst Cascade' }
        ];

        // 1回目の fetch (マニフェスト)
        commonFetch.mockResolvedValueOnce(manifestData);
        // 2回目の fetch (更新履歴)
        commonFetch.mockResolvedValueOnce([
            { version: '0.1', date: '2026-05-16', content: [{ type: 'new', text: 'test' }] }
        ]);

        await showHistory(projectId);

        // マニフェストの取得を確認
        expect(commonFetch).toHaveBeenCalledWith('data/project_list.json');

        // 更新履歴の取得パスが共通仕様に準拠しているか確認
        expect(commonFetch).toHaveBeenCalledWith('https://t-i-oak.github.io/BurstCascade/data/update_history.json');
    });
});

describe('portal main.js - resolveAbsoluteUrl', () => {
    it('should return empty string if path is empty', () => {
        expect(resolveAbsoluteUrl('', 'https://example.com')).toBe('');
        expect(resolveAbsoluteUrl(null, 'https://example.com')).toBe('');
    });

    it('should return the path unchanged if it is already an absolute URL', () => {
        expect(resolveAbsoluteUrl('https://other.com/logo.svg', 'https://example.com/')).toBe('https://other.com/logo.svg');
        expect(resolveAbsoluteUrl('http://other.com/logo.svg', 'https://example.com/')).toBe('http://other.com/logo.svg');
    });

    it('should resolve root-relative paths against the origin of the base URL', () => {
        expect(resolveAbsoluteUrl('/assets/logo.svg', 'https://example.com/project/')).toBe('https://example.com/assets/logo.svg');
        expect(resolveAbsoluteUrl('/GameWorksOAK/assets/logo.svg', 'http://localhost:3000/GameWorksOAK/')).toBe('http://localhost:3000/GameWorksOAK/assets/logo.svg');
    });

    it('should resolve relative paths against directory base URL with trailing slash', () => {
        expect(resolveAbsoluteUrl('assets/logo.svg', 'https://example.com/project/')).toBe('https://example.com/project/assets/logo.svg');
    });

    it('should resolve relative paths against directory base URL without trailing slash', () => {
        expect(resolveAbsoluteUrl('assets/logo.svg', 'https://example.com/project')).toBe('https://example.com/project/assets/logo.svg');
    });

    it('should resolve relative paths against base URL containing filename', () => {
        expect(resolveAbsoluteUrl('assets/logo.svg', 'https://example.com/project/index.html')).toBe('https://example.com/project/assets/logo.svg');
    });
});

describe('portal main.js - badge featuredUntil', () => {
    it('should mark info badge as featured through featuredUntil date', () => {
        const badge = { content: 'v1.0 Release', type: 'info', featuredUntil: '2026-06-02' };

        expect(isBadgeFeatured(badge, '2026-06-02')).toBe(true);
        expect(getBadgeClassName(badge, '2026-06-02')).toBe('badge texture-info is-featured');
    });

    it('should not mark info badge as featured after featuredUntil date', () => {
        const badge = { content: 'v1.0 Release', type: 'info', featuredUntil: '2026-06-02' };

        expect(isBadgeFeatured(badge, '2026-06-03')).toBe(false);
        expect(getBadgeClassName(badge, '2026-06-03')).toBe('badge texture-info');
    });

    it('should not mark badge as featured when featuredUntil is missing or invalid', () => {
        expect(isBadgeFeatured({ content: 'v1.0 Release', type: 'info' }, '2026-06-02')).toBe(false);
        expect(isBadgeFeatured({ content: 'v1.0 Release', type: 'info', featuredUntil: '2026-99-99' }, '2026-06-02')).toBe(false);
        expect(isBadgeFeatured({ content: 'v1.0 Release', type: 'info', featuredUntil: '2026/06/02' }, '2026-06-02')).toBe(false);
    });

    it('should render none badge with hidden class', () => {
        expect(getBadgeClassName({ content: '', type: 'none' }, '2026-06-02')).toBe('badge none');
    });
});

describe('portal main.js - initPortal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        clearL10nCache();
        // DOMの初期化
        document.body.innerHTML = `
            <header>
                <select id="language-selector">
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                </select>
            </header>
            <div id="portal-version"></div>
            <div id="gamesGrid"></div>
            <svg>
                <g id="logo-cog-1"></g>
                <g id="logo-cog-2"></g>
            </svg>
            <div id="modalOverlay">
                <div id="modalTitle"></div>
                <div id="modalBody"></div>
                <button id="modalClose"></button>
            </div>
            <main class="Container"><p></p></main>
        `;
        global.__APP_VERSION__ = '0.10.0';
        
        // global.fetch のモック (ロゴSVGの fetch など)
        global.fetch = vi.fn();

        // IntersectionObserver のモック (JSDOM環境用)
        global.IntersectionObserver = class {
            constructor() {}
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    });

    it('should resolve thumbnail relative image URL to absolute URL correctly', async () => {
        const projectList = [
            { id: 'BurstCascade', title: 'Burst Cascade' }
        ];

        const projectInfo = {
            title: 'Burst Cascade',
            description: 'A cascade of bursts.',
            tags: ['Puzzle'],
            badge: { content: 'NEW', type: 'info' },
            image: 'assets/thumbnail.png',
            button: { content: 'PLAY', url: 'https://t-i-oak.github.io/BurstCascade/index.html', type: 'published' }
        };

        // commonFetch で project_list.json と project_info.json を順番に解決
        commonFetch.mockResolvedValueOnce(projectList);
        commonFetch.mockResolvedValueOnce(projectInfo);

        // ロゴやその他アセットの fetch 用のダミー
        global.fetch.mockResolvedValue({
            ok: true,
            text: () => Promise.resolve('<svg></svg>')
        });

        await initPortal();

        // gamesGrid のレンダリング結果を確認
        const gamesGrid = document.getElementById('gamesGrid');
        expect(gamesGrid.innerHTML).toContain(`style="--bg-image: url('https://t-i-oak.github.io/BurstCascade/assets/thumbnail.png')"`);
    });

    it('should render featured info badge class during featuredUntil period', async () => {
        const projectList = [
            { id: 'BurstCascade', title: 'Burst Cascade' }
        ];

        const projectInfo = {
            title: 'Burst Cascade',
            description: 'A cascade of bursts.',
            tags: ['Puzzle'],
            badge: { content: 'v1.0 Release', type: 'info', featuredUntil: '2999-12-31' },
            image: 'assets/thumbnail.png',
            button: { content: 'PLAY', url: 'https://t-i-oak.github.io/BurstCascade/index.html', type: 'published' }
        };

        commonFetch.mockResolvedValueOnce(projectList);
        commonFetch.mockResolvedValueOnce(projectInfo);

        await initPortal();

        const badge = document.querySelector('.badge');
        expect(badge.className).toBe('badge texture-info is-featured');
    });

    it('should render png logo paths as image tags without fetching logo content', async () => {
        const projectList = [
            { id: 'MagicCrystal', title: 'Magic Crystal' }
        ];

        const projectInfo = {
            title: 'Magic Crystal',
            logo: {
                path: 'assets/logo.png',
                type: 'standard'
            },
            description: 'A magic adventure.',
            tags: ['Action'],
            badge: { content: '', type: 'none' },
            image: 'assets/thumbnail.png',
            button: { content: 'PLAY', url: 'https://t-i-oak.github.io/MagicCrystal/index.html', type: 'published' }
        };

        // commonFetch で project_list.json と project_info.json を順番に解決
        commonFetch.mockResolvedValueOnce(projectList);
        commonFetch.mockResolvedValueOnce(projectInfo);

        await initPortal();

        const gamesGrid = document.getElementById('gamesGrid');
        expect(gamesGrid.innerHTML).toContain('<img class="GameLogoImg" src="https://t-i-oak.github.io/MagicCrystal/assets/logo.png" alt="Magic Crystal logo">');
        
        // PNG画像ロゴの場合は SVG と違って fetch(path) は走らないこと
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should rotate normalized logo cogs around their real coordinates', async () => {
        commonFetch.mockResolvedValueOnce([]);

        await initPortal();

        Object.defineProperty(window, 'scrollY', {
            value: 120,
            configurable: true
        });
        window.dispatchEvent(new Event('scroll'));

        expect(document.getElementById('logo-cog-1').getAttribute('transform')).toBe('rotate(60, 98.002383, 16.425182)');
        expect(document.getElementById('logo-cog-2').getAttribute('transform')).toBe('rotate(-60, 124.554465, 34.179775)');
    });

    it('should keep the header logo text vectorized and cogs addressable', () => {
        const html = readFileSync('index.html', 'utf8');

        expect(html).toContain('id="logo-cog-1"');
        expect(html).toContain('id="logo-cog-2"');
        expect(html).not.toContain('<text');
        expect(html).not.toContain('matrix(0.17386665');
    });
});
