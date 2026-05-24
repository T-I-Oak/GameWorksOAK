import { commonFetch } from '../utils/fetch.js';

const STORAGE_KEY = 'gameworks_portal_lang';
const INITIAL_LANG = 'ja';  // 言語未選択時のデフォルト（初期言語）
const FALLBACK_LANG = 'en'; // リソースフォールバック用のデフォルト
const MAX_DEPTH = 10;

// キャッシュストア (URL -> 多言語展開前の生のJSONデータ)
const resourceCache = new Map();

// アプリがサポートする言語のリスト
let appSupportedLangs = null;

// 言語変更時に呼び出されるコールバックリスナーのセット
const languageChangeListeners = new Set();

// 同一ドメインの他タブ/他ウィンドウでの変更を検知するための storage イベントリスナーの管理状態
let isStorageListenerAttached = false;
let lastNotifiedActiveLang = null;

// 言語コード規格マスター
const LANGUAGE_NAMES = {
    'ja': '日本語',
    'en': 'English',
    'zh': '中文',
    'ko': '한국어'
};

/**
 * キャッシュされている多言語リソース、登録されたサポート言語、リスナーを完全にクリアします（テスト用または強制更新用）
 */
export function clearL10nCache() {
    resourceCache.clear();
    appSupportedLangs = null;
    languageChangeListeners.clear();
    lastNotifiedActiveLang = null;
}

/**
 * 言語設定を取得します。
 * @returns {string} 現在のグローバル言語コード (例: 'en', 'ja')
 */
export function getLanguage() {
    try {
        return localStorage.getItem(STORAGE_KEY) || INITIAL_LANG;
    } catch (e) {
        return INITIAL_LANG;
    }
}

/**
 * 現在のアプリのサポート状況（supportedLangs）を反映した、実際に適用すべき「アクティブ言語コード」を返します。
 * @returns {string} 有効なアクティブ言語コード
 */
export function getActiveLanguage() {
    const globalLang = getLanguage();
    
    // サポート言語が設定されていない場合は、グローバル言語をそのまま返す
    if (!appSupportedLangs || appSupportedLangs.length === 0) {
        return globalLang;
    }
    
    // グローバル言語がサポートされていれば、それを返す
    if (appSupportedLangs.includes(globalLang)) {
        return globalLang;
    }
    
    // サポートされていない場合のフォールバック優先順位:
    // 1. サポート言語内に FALLBACK_LANG ('en') があれば適用
    // 2. 無ければサポートリストの最初の言語を適用
    if (appSupportedLangs.includes(FALLBACK_LANG)) {
        return FALLBACK_LANG;
    }
    return appSupportedLangs[0];
}

/**
 * 言語設定を保存し、登録されたすべてのリスナーに変更を通知します。
 * @param {string} lang - 保存する言語コード
 */
export function setLanguage(lang) {
    if (!lang) return;
    try {
        localStorage.setItem(STORAGE_KEY, lang);
        notifyListeners();
    } catch (e) {
        // 環境エラー（localStorage使用不可など）の場合は無視
    }
}

/**
 * アクティブ言語の変更を検知してリスナーに通知します。
 */
function notifyListeners() {
    const activeLang = getActiveLanguage();
    if (activeLang !== lastNotifiedActiveLang) {
        lastNotifiedActiveLang = activeLang;
        for (const callback of languageChangeListeners) {
            try {
                callback(activeLang);
            } catch (e) {
                console.error('i18n: listener error:', e);
            }
        }
    }
}

/**
 * ブラウザの storage イベントを監視するための内部セットアップ
 */
function setupStorageListener() {
    if (isStorageListenerAttached || typeof window === 'undefined') return;
    
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            notifyListeners();
        }
    });
    isStorageListenerAttached = true;
}

/**
 * 言語設定が変更（他画面での変更含む）され、かつアプリ内での「アクティブ言語」が変化した際に呼び出されるコールバックを登録します。
 * @param {function(string): void} callback - 新しいアクティブ言語コードを受け取るコールバック関数
 * @returns {function(): void} 購読を解除するためのクリーンアップ関数
 */
export function onLanguageChange(callback) {
    if (typeof callback !== 'function') return () => {};
    
    languageChangeListeners.add(callback);
    setupStorageListener();
    
    // 登録時点のアクティブ言語を初期記録
    if (lastNotifiedActiveLang === null) {
        lastNotifiedActiveLang = getActiveLanguage();
    }
    
    return () => {
        languageChangeListeners.delete(callback);
    };
}

/**
 * `<select>` 要素に対して、指定されたサポート言語リスト（supportedLangs）に基づいて `<option>` 要素を自動展開し、
 * さらに言語設定の双方向バインドと自動同期をセットアップします。
 * @param {string|HTMLSelectElement} selectorOrElement - 対象の `<select>` 要素またはセレクター文字列
 * @param {string[]} supportedLangs - サポートする言語コードの配列（必須）
 * @param {function(string): void} [onChangeCallback] - 変更時に呼び出される追加コールバック
 */
export function setupLanguageSelector(selectorOrElement, supportedLangs, onChangeCallback) {
    if (typeof window === 'undefined') return;
    
    let selectEl = selectorOrElement;
    if (typeof selectEl === 'string') {
        selectEl = document.querySelector(selectEl);
    }
    
    if (!selectEl || selectEl.tagName !== 'SELECT') {
        console.warn('i18n: setupLanguageSelector requires a valid <select> element.');
        return;
    }
    
    if (!Array.isArray(supportedLangs) || supportedLangs.length === 0) {
        console.warn('i18n: setupLanguageSelector requires a non-empty array of supported languages.');
        return;
    }
    
    // 1. アプリ全体のサポート言語として登録し、<option> を自動生成
    appSupportedLangs = supportedLangs;
    
    // 既存のオプションをクリア
    selectEl.innerHTML = '';
    
    // オプションを自動生成して挿入
    supportedLangs.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = LANGUAGE_NAMES[lang] || lang;
        selectEl.appendChild(option);
    });
    
    // 2. 現在のアクティブ言語を取得し、初期選択状態をセット
    const activeLang = getActiveLanguage();
    selectEl.value = activeLang;
    
    // 3. プルダウンの change イベントを監視
    const handleChange = (e) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        if (typeof onChangeCallback === 'function') {
            onChangeCallback(newLang);
        }
    };
    
    selectEl.addEventListener('change', handleChange);
    
    // 4. 他画面やポータルでの言語変更時に、プルダウンの選択肢を自動で同期する
    const unsubscribe = onLanguageChange((newActiveLang) => {
        if (selectEl.value !== newActiveLang) {
            selectEl.value = newActiveLang;
            if (typeof onChangeCallback === 'function') {
                onChangeCallback(newActiveLang);
            }
        }
    });
    
    // 解除用に退避
    selectEl._i18nUnsubscribe = unsubscribe;
}

/**
 * JSONオブジェクトを再帰的に走査し、"lang-store"キーの内容をアクティブ言語に従って展開した新しいオブジェクトを返します。
 * @param {*} val - 入力オブジェクトや値
 * @param {number} [depth=0] - 現在のネストの深さ
 * @returns {*} 展開後のオブジェクトまたは値
 * @throws {Error} 探索の深さが10を超えた場合
 */
export function expandLanguageResource(val, depth = 0) {
    if (depth > MAX_DEPTH) {
        throw new Error(`i18n: Language resource expansion exceeded maximum depth of ${MAX_DEPTH}.`);
    }

    if (val === null || typeof val !== 'object') {
        return val;
    }

    // 配列の処理
    if (Array.isArray(val)) {
        return val.map(item => expandLanguageResource(item, depth + 1));
    }

    // オブジェクトに "lang-store" キーが存在する場合
    if ('lang-store' in val) {
        const store = val['lang-store'];
        if (store && typeof store === 'object') {
            const currentLang = getActiveLanguage();
            // 1. まず現在のアクティブ言語を試みる
            let selectedResource = store[currentLang];
            // 2. 現在のアクティブ言語が無ければ、フォールバック言語 (FALLBACK_LANG = 'en') を適用
            if (selectedResource === undefined) {
                selectedResource = store[FALLBACK_LANG];
            }
            // 選択されたリソースに対しても再帰的に展開を適用する
            return expandLanguageResource(selectedResource, depth + 1);
        }
    }

    // 通常のオブジェクトの走査
    const expandedObj = {};
    for (const key of Object.keys(val)) {
        expandedObj[key] = expandLanguageResource(val[key], depth + 1);
    }
    return expandedObj;
}

/**
 * JSONファイルを非同期で読み込み、言語リソースを展開して返します。
 * @param {string} url - 読み込み先URL
 * @returns {Promise<object>} 言語展開されたJSONオブジェクト
 */
export async function loadJsonWithL10n(url) {
    const rawJson = await commonFetch(url);
    return expandLanguageResource(rawJson);
}

/**
 * JSONファイルをキャッシュを利用して非同期ロードし、多言語展開したオブジェクトを返します。
 * 初回読み込み時はサーバーから取得した生の（多言語定義を含んだ）データをメモリにキャッシュし、
 * 2回目以降の呼び出しでは、通信を一切発生させずにキャッシュされた生データからアクティブ言語に合わせて展開した結果を返します。
 * @param {string} url - 読み込み先URL
 * @param {boolean} [forceBypass=false] - キャッシュをバイパスしてサーバーから強制再取得するかどうか
 * @returns {Promise<object>} 言語展開されたJSONオブジェクト
 */
export async function loadJsonWithL10nCached(url, forceBypass = false) {
    let rawJson;
    if (forceBypass || !resourceCache.has(url)) {
        rawJson = await commonFetch(url);
        resourceCache.set(url, rawJson);
    } else {
        rawJson = resourceCache.get(url);
    }
    return expandLanguageResource(rawJson);
}
