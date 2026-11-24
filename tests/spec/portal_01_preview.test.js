import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { initPortal, showHistory } from '../../src/portal/main.js';
import { clearL10nCache } from '../../src/lib/core/i18n.js';
import { commonFetch } from '../../src/lib/utils/fetch.js';
vi.mock('../../src/lib/utils/fetch.js', () => ({ commonFetch: vi.fn() }));

beforeEach(() => {
    vi.clearAllMocks();
    clearL10nCache();
    const store = new Map();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
        getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key)
    } });
    global.__APP_VERSION__ = '1.17.0';
    global.IntersectionObserver = class { observe() {} };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '<svg></svg>' });
    document.body.innerHTML = `<header><span id="preview-tag" hidden>Preview</span><select id="language-selector"><option value="ja">日本語</option><option value="en">English</option></select></header>
        <div id="gamesGrid"></div><div id="portal-version"></div><div id="modalOverlay"><div id="modalTitle"></div><div id="modalBody"></div><button id="modalClose"></button></div>`;
});
afterEach(() => { window.history.replaceState({}, '', '/'); });

function mockProjects({ fail = false, pending = false } = {}) {
    commonFetch.mockImplementation(async url => {
        if (url === 'data/project_list.json') return [{ id: 'Game', title: 'Game' }];
        if (fail) throw new Error('404');
        if (url.endsWith('update_history.json')) return [];
        return { title: 'Game', description: { 'lang-store': { ja: '紹介', en: 'Description' } }, tags: [],
            image: 'https://t-i-oak.github.io/Game/assets/a.png', logo: { path: 'assets/logo.svg' },
            button: { url: 'https://t-i-oak.github.io/Game/', content: 'PLAY', type: pending ? 'pending' : 'published' } };
    });
}

describe('portal environment selection', () => {
    for (const portalPath of ['/GameWorksOAK/', '/GameWorksOAK/preview/']) {
        for (const query of ['', '?preview=on', '?preview=off']) {
            it(`aligns all resources at ${portalPath}${query}`, async () => {
                window.history.replaceState({}, '', portalPath + query);
                mockProjects();
                await initPortal();
                const preview = query === '?preview=on';
                const base = `https://t-i-oak.github.io/Game/${preview ? 'preview/' : ''}`;
                expect(document.getElementById('preview-tag').hidden).toBe(!preview);
                expect(commonFetch).toHaveBeenCalledWith(base + 'data/project_info.json');
                expect(fetch).toHaveBeenCalledWith(base + 'assets/logo.svg');
                expect(document.querySelector('.GameCardImage').src).toBe(base + 'assets/a.png');
                expect(document.querySelector('.BtnMore').href).toBe(base);
                await showHistory('Game');
                expect(commonFetch).toHaveBeenCalledWith(base + 'data/update_history.json');
                document.getElementById('language-selector').value = 'en';
                document.getElementById('language-selector').dispatchEvent(new Event('change'));
                await vi.waitFor(() => expect(document.querySelector('.GameInfo p')?.textContent).toBe('Description'));
                expect(window.location.search).toBe(query);
                expect(document.querySelector('.BtnMore').href).toBe(base);
            });
        }
    }
    it('uses the existing unavailable card without retrying production', async () => {
        window.history.replaceState({}, '', '/GameWorksOAK/?preview=on');
        mockProjects({ fail: true });
        await initPortal();
        expect(document.querySelector('.GameCard').classList.contains('state-maintenance')).toBe(true);
        expect(document.querySelector('.HistoryLink').disabled).toBe(true);
        expect(commonFetch).not.toHaveBeenCalledWith('https://t-i-oak.github.io/Game/data/project_info.json');
    });
    it('keeps pending games disabled in preview', async () => {
        window.history.replaceState({}, '', '/?preview=on');
        mockProjects({ pending: true });
        await initPortal();
        expect(document.querySelector('.BtnMore').getAttribute('onclick')).toBe('return false;');
        expect(document.querySelector('.BtnMore').getAttribute('href')).toBe('javascript:void(0)');
    });
});
