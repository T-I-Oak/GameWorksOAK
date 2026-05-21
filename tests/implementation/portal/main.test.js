import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initPortal, showHistory, resolveAbsoluteUrl } from '../../../src/portal/main.js';

// DOM のモック
document.body.innerHTML = `
    <header></header>
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
`;

// commonFetch のモックが必要だが、main.js で import されているので vi.mock を使う
vi.mock('../../../src/lib/utils/fetch.js', () => ({
    commonFetch: vi.fn()
}));

import { commonFetch } from '../../../src/lib/utils/fetch.js';

describe('portal main.js - showHistory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // showHistory用の最小限のDOMを設定
        document.body.innerHTML = `
            <div id="modalOverlay">
                <div id="modalTitle"></div>
                <div id="modalBody"></div>
                <button id="modalClose"></button>
            </div>
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

describe('portal main.js - initPortal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // DOMの初期化
        document.body.innerHTML = `
            <header></header>
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
        `;
        global.__APP_VERSION__ = '0.10.0';
        
        // global.fetch のモック
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
            badge: { content: 'NEW', type: 'hot' },
            image: 'assets/thumbnail.png',
            button: { content: 'PLAY', url: 'https://t-i-oak.github.io/BurstCascade/index.html', type: 'published' }
        };

        // commonFetch のモック (project_list.json のロード)
        commonFetch.mockResolvedValueOnce(projectList);

        // global.fetch のモック (project_info.json のロード用)
        global.fetch.mockImplementation((url) => {
            if (url.includes('project_info.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(projectInfo)
                });
            }
            // 他のfetch（ロゴなど）は空のレスポンス
            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve('<svg></svg>')
            });
        });

        await initPortal();

        // gamesGrid のレンダリング結果を確認
        const gamesGrid = document.getElementById('gamesGrid');
        expect(gamesGrid.innerHTML).toContain(`style="--bg-image: url('https://t-i-oak.github.io/BurstCascade/assets/thumbnail.png')"`);
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

        commonFetch.mockResolvedValueOnce(projectList);
        global.fetch.mockImplementation((url) => {
            if (url.includes('project_info.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(projectInfo)
                });
            }

            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve('<svg></svg>')
            });
        });

        await initPortal();

        const gamesGrid = document.getElementById('gamesGrid');
        expect(gamesGrid.innerHTML).toContain('<img class="GameLogoImg" src="https://t-i-oak.github.io/MagicCrystal/assets/logo.png" alt="Magic Crystal logo">');
        expect(global.fetch).toHaveBeenCalledTimes(1);
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
