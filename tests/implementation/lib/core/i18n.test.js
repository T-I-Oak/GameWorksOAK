import { it, expect, describe, vi, beforeEach } from 'vitest';
import { 
    getLanguage, 
    setLanguage, 
    expandLanguageResource, 
    loadJsonWithL10n, 
    getActiveLanguage, 
    onLanguageChange, 
    setupLanguageSelector, 
    clearL10nCache,
    renderI18nTemplate,
    applyI18nTemplate,
    bindI18nTemplate
} from '../../../../src/lib/core/i18n.js';

// localStorage のファイルグローバルモック化
const mockStore = {};
const localStorageMock = {
    getItem: vi.fn((key) => mockStore[key] || null),
    setItem: vi.fn((key, value) => { mockStore[key] = String(value); }),
    removeItem: vi.fn((key) => { delete mockStore[key]; }),
    clear: vi.fn(() => { for (let key in mockStore) delete mockStore[key]; })
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true, writable: true });

export const testI18n = () => {
    const results = [];

    try {
        localStorage.clear();
        clearL10nCache();

        // 1. デフォルト言語の検証（未選択時は "ja" であること）
        results.push({ name: 'i18n: Default initial language is ja', pass: getLanguage() === 'ja' });

        // 2. 言語設定の設定と取得
        setLanguage('en');
        results.push({ name: 'i18n: setLanguage/getLanguage en works', pass: getLanguage() === 'en' });
        results.push({ name: 'i18n: storage key is gameworks_portal_lang', pass: localStorage.getItem('gameworks_portal_lang') === 'en' });

        // 3. 単純なオブジェクト展開
        setLanguage('ja'); // 日本語に設定
        const simpleObj = {
            title: {
                'lang-store': {
                    ja: 'こんにちは',
                    en: 'Hello'
                }
            },
            normalKey: 'no-change'
        };
        const expanded1 = expandLanguageResource(simpleObj);
        results.push({ name: 'i18n: expandLanguageResource simple replacement (ja)', pass: expanded1.title === 'こんにちは' && expanded1.normalKey === 'no-change' });

        // English に切り替えた場合の展開
        setLanguage('en');
        const expandedEn = expandLanguageResource(simpleObj);
        results.push({ name: 'i18n: expandLanguageResource simple replacement (en)', pass: expandedEn.title === 'Hello' });

        // 4. フォールバックの検証 (現在の選択言語 ja が定義されていないとき、en にフォールバックされること)
        setLanguage('ja'); // ja に設定
        const fallbackObj = {
            title: {
                'lang-store': {
                    en: 'Hello (Default)' // ja は定義されていない
                }
            }
        };
        const expandedFallback = expandLanguageResource(fallbackObj);
        results.push({ name: 'i18n: fallback to en if current language is missing', pass: expandedFallback.title === 'Hello (Default)' });

        // 5. 配列とネストされたオブジェクトの展開
        const complexObj = {
            list: [
                {
                    name: {
                        'lang-store': {
                            ja: 'ゲームA',
                            en: 'Game A'
                        }
                    }
                }
            ]
        };
        const expandedComplex = expandLanguageResource(complexObj);
        results.push({ name: 'i18n: recursive expansion in arrays and nested structures', pass: expandedComplex.list[0].name === 'ゲームA' });

        // 6. 深さ制限の検証
        // 循環構造を作成してテスト
        const circularObj = {};
        circularObj.self = circularObj; // 循環参照
        let didThrow = false;
        try {
            expandLanguageResource(circularObj);
        } catch (e) {
            didThrow = e.message.includes('exceeded maximum depth');
        }
        results.push({ name: 'i18n: circular reference / depth limit throws error', pass: didThrow });

        // ネストが11段の場合の例外検証
        let deepObj = { 'lang-store': { ja: 'end', en: 'end' } };
        for (let i = 0; i < 11; i++) {
            deepObj = { nested: deepObj };
        }
        let didThrowDeep = false;
        try {
            expandLanguageResource(deepObj);
        } catch (e) {
            didThrowDeep = e.message.includes('exceeded maximum depth');
        }
        results.push({ name: 'i18n: depth level > 10 throws error', pass: didThrowDeep });

    } catch (e) {
        results.push({ name: 'i18n tests', pass: false, error: e.message });
    }

    return results;
};

describe('i18n', () => {
    beforeEach(() => {
        clearL10nCache();
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should pass all basic implementation tests', () => {
        const results = testI18n();
        results.forEach(res => {
            expect(res.pass, `${res.name}: ${res.error}`).toBe(true);
        });
    });

    // 7. loadJsonWithL10n (Fetch モック検証)
    it('should fetch and expand JSON via loadJsonWithL10n', async () => {
        const mockData = {
            name: {
                'lang-store': {
                    en: 'Portal'
                }
            }
        };

        const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockData)
            });
        });

        setLanguage('en');
        const res = await loadJsonWithL10n('http://example.com/data.json');
        
        expect(res.name).toBe('Portal');
        expect(fetchSpy).toHaveBeenCalledWith('http://example.com/data.json', {});

        fetchSpy.mockRestore();
    });

    // 8. getActiveLanguage の自動補正テスト
    describe('getActiveLanguage (Active Language resolution)', () => {
        it('should return global language if no supported list is set', () => {
            setLanguage('zh');
            expect(getActiveLanguage()).toBe('zh');
        });

        it('should return global language if it is included in supported list', () => {
            const select = document.createElement('select');
            setupLanguageSelector(select, ['ja', 'en']);
            
            setLanguage('ja');
            expect(getActiveLanguage()).toBe('ja');
        });

        it('should fall back to en if global language is unsupported but en is available', () => {
            const select = document.createElement('select');
            setupLanguageSelector(select, ['ja', 'en']);
            
            setLanguage('zh'); // サポート外の言語
            expect(getActiveLanguage()).toBe('en'); // en に自動補正されること
            expect(getLanguage()).toBe('zh'); // localStorageの生設定は壊さず温存されていること
        });

        it('should fall back to the first language in the list if global is unsupported and en is not available', () => {
            const select = document.createElement('select');
            setupLanguageSelector(select, ['ko', 'zh']); // ja, en が含まれないリスト
            
            setLanguage('ja'); // サポート外の言語
            expect(getActiveLanguage()).toBe('ko'); // リスト先頭の ko に補正されること
        });
    });

    // 9. onLanguageChange イベント伝播テスト
    describe('onLanguageChange (Event subscription)', () => {
        it('should trigger callback on active language changes', () => {
            const callback = vi.fn();
            const unsubscribe = onLanguageChange(callback);

            setLanguage('en');
            expect(callback).toHaveBeenCalledWith('en');
            expect(callback).toHaveBeenCalledTimes(1);

            unsubscribe();
        });

        it('should not trigger callback after unsubscription', () => {
            const callback = vi.fn();
            const unsubscribe = onLanguageChange(callback);

            unsubscribe();
            setLanguage('en');
            expect(callback).not.toHaveBeenCalled();
        });

        it('should not trigger redundant callbacks if active language remains same', () => {
            const select = document.createElement('select');
            setupLanguageSelector(select, ['ja', 'en']); // ja, en のみサポート

            const callback = vi.fn();
            onLanguageChange(callback);

            // サポート外の言語に設定 ➔ アクティブ言語は en に解決される
            setLanguage('zh'); 
            expect(callback).toHaveBeenCalledWith('en');
            expect(callback).toHaveBeenCalledTimes(1);

            // 別のサポート外言語に設定 ➔ アクティブ言語は依然として en のままであるため、発火が抑制されること
            setLanguage('ko'); 
            expect(callback).toHaveBeenCalledTimes(1); 
        });

        it('should handle storage event simulation', () => {
            const callback = vi.fn();
            onLanguageChange(callback);

            // storage イベントのシミュレーション
            const storageEvent = new window.Event('storage');
            Object.defineProperty(storageEvent, 'key', { value: 'gameworks_portal_lang' });
            
            setLanguage('en'); // localStorageを変更しておく
            window.dispatchEvent(storageEvent);

            expect(callback).toHaveBeenCalledWith('en');
        });
    });

    // 10. setupLanguageSelector (UIバインド & <option> 自動展開) テスト
    describe('setupLanguageSelector (UI Dual-binding)', () => {
        it('should generate option elements and populate display names', () => {
            const select = document.createElement('select');
            setupLanguageSelector(select, ['ja', 'en', 'fr']);

            expect(select.options.length).toBe(3);
            
            expect(select.options[0].value).toBe('ja');
            expect(select.options[0].textContent).toBe('日本語');
            
            expect(select.options[1].value).toBe('en');
            expect(select.options[1].textContent).toBe('English');

            // 規格外（fr）はコードがそのまま表示名になること
            expect(select.options[2].value).toBe('fr');
            expect(select.options[2].textContent).toBe('fr');
        });

        it('should synchronize value bidirectionally (UI change triggers setLanguage)', () => {
            const select = document.createElement('select');
            setupLanguageSelector(select, ['ja', 'en']);

            expect(select.value).toBe('ja'); // 初期値

            // UI操作のシミュレーション
            select.value = 'en';
            select.dispatchEvent(new window.Event('change'));

            expect(getLanguage()).toBe('en'); // 設定が同期していること
        });

        it('should trigger custom onChangeCallback on changes', () => {
            const select = document.createElement('select');
            const callback = vi.fn();
            setupLanguageSelector(select, ['ja', 'en'], callback);

            select.value = 'en';
            select.dispatchEvent(new window.Event('change'));

            expect(callback).toHaveBeenCalledWith('en');
        });

        it('should synchronize dropdown visually when external setting changes', () => {
            const select = document.createElement('select');
            setupLanguageSelector(select, ['ja', 'en']);

            expect(select.value).toBe('ja');

            // 外部での言語設定変更
            setLanguage('en');

            expect(select.value).toBe('en'); // プルダウンの見た目も en に同期されていること
        });
    });

    describe('i18n HTML template rendering', () => {
        const template = `
            <section>
                <h3>{help.objective.title}</h3>
                <p>{help.objective.body}</p>
                <span>{help.count}</span>
            </section>
        `;
        const resource = {
            help: {
                objective: {
                    title: {
                        'lang-store': {
                            ja: 'JP Objective',
                            en: 'Objective'
                        }
                    },
                    body: {
                        'lang-store': {
                            ja: '<strong>JP Body</strong>',
                            en: 'Disable every enemy Core.'
                        }
                    }
                },
                count: 3,
                rawHtml: {
                    'lang-store': {
                        ja: '<em>raw jp</em>',
                        en: '<em>raw en</em>'
                    }
                }
            }
        };

        it('should render placeholders with expanded language resources and escape HTML by default', () => {
            setLanguage('ja');

            const html = renderI18nTemplate(template, resource);

            expect(html).toContain('<h3>JP Objective</h3>');
            expect(html).toContain('&lt;strong&gt;JP Body&lt;/strong&gt;');
            expect(html).toContain('<span>3</span>');
        });

        it('should support raw placeholders and escape false option', () => {
            setLanguage('en');

            expect(renderI18nTemplate('{raw:help.rawHtml}', resource)).toBe('<em>raw en</em>');
            expect(renderI18nTemplate('{help.rawHtml}', resource, { escape: false })).toBe('<em>raw en</em>');
        });

        it('should keep missing placeholders and warn by default', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const html = renderI18nTemplate('<p>{help.missing}</p>', resource);

            expect(html).toBe('<p>{help.missing}</p>');
            expect(warnSpy).toHaveBeenCalledWith('i18n: missing template value for "help.missing".');

            warnSpy.mockRestore();
        });

        it('should apply rendered HTML to a container and call afterRender', () => {
            document.body.innerHTML = '<div id="help"></div>';
            const afterRender = vi.fn();

            const container = applyI18nTemplate('#help', '<p>{help.objective.title}</p>', resource, {
                afterRender
            });

            expect(container).toBe(document.getElementById('help'));
            expect(container.innerHTML).toBe('<p>JP Objective</p>');
            expect(afterRender).toHaveBeenCalledWith(container);
        });

        it('should warn and no-op when a container is missing', () => {
            document.body.innerHTML = '';
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const afterRender = vi.fn();

            const container = applyI18nTemplate('#missing', template, resource, { afterRender });
            const unbind = bindI18nTemplate('#missing', template, resource, { afterRender });

            expect(container).toBeNull();
            expect(typeof unbind).toBe('function');
            expect(afterRender).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledWith('i18n: template container was not found.');

            warnSpy.mockRestore();
        });

        it('should bind template rendering to language changes and unsubscribe', () => {
            document.body.innerHTML = '<div id="help"></div>';
            setLanguage('ja');
            const afterRender = vi.fn();

            const unbind = bindI18nTemplate('#help', '<p>{help.objective.title}</p>', resource, {
                afterRender
            });
            const container = document.getElementById('help');

            expect(container.innerHTML).toBe('<p>JP Objective</p>');
            expect(afterRender).toHaveBeenCalledTimes(1);

            setLanguage('en');
            expect(container.innerHTML).toBe('<p>Objective</p>');
            expect(afterRender).toHaveBeenCalledTimes(2);

            unbind();
            setLanguage('ja');
            expect(container.innerHTML).toBe('<p>Objective</p>');
            expect(afterRender).toHaveBeenCalledTimes(2);
        });
    });
});
