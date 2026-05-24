import { it, expect, describe, vi } from 'vitest';
import { getLanguage, setLanguage, expandLanguageResource, loadJsonWithL10n } from '../../../../src/lib/core/i18n.js';

export const testI18n = () => {
    const results = [];

    // localStorage のモック化
    const originalLocalStorage = window.localStorage;
    const mockStore = {};
    const localStorageMock = {
        getItem: (key) => mockStore[key] || null,
        setItem: (key, value) => { mockStore[key] = String(value); },
        removeItem: (key) => { delete mockStore[key]; },
        clear: () => { for (let key in mockStore) delete mockStore[key]; }
    };

    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

    try {
        localStorage.clear();

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
    } finally {
        Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
    }

    return results;
};

describe('i18n', () => {
    it('should pass all implementation tests', () => {
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

        // window.fetch をモック化
        const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockData)
            });
        });

        // 言語を 'en' にセット
        setLanguage('en');
        const res = await loadJsonWithL10n('http://example.com/data.json');
        
        expect(res.name).toBe('Portal');
        expect(fetchSpy).toHaveBeenCalledWith('http://example.com/data.json', {});

        fetchSpy.mockRestore();
    });
});
