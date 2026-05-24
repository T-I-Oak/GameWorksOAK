import { commonFetch } from '../utils/fetch.js';

const STORAGE_KEY = 'gameworks_portal_lang';
const INITIAL_LANG = 'ja';  // 言語未選択時のデフォルト（初期言語）
const FALLBACK_LANG = 'en'; // リソースフォールバック用のデフォルト
const MAX_DEPTH = 10;

/**
 * 言語設定を取得します。
 * @returns {string} 現在の言語コード (例: 'en', 'ja')
 */
export function getLanguage() {
    try {
        return localStorage.getItem(STORAGE_KEY) || INITIAL_LANG;
    } catch (e) {
        return INITIAL_LANG;
    }
}

/**
 * 言語設定を保存します。
 * @param {string} lang - 保存する言語コード
 */
export function setLanguage(lang) {
    if (!lang) return;
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
        // 環境エラー（localStorage使用不可など）の場合は無視
    }
}

/**
 * JSONオブジェクトを再帰的に走査し、"lang-store"キーの内容を現在の言語に従って展開した新しいオブジェクトを返します。
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
            const currentLang = getLanguage();
            // 1. まず現在の選択言語を試みる
            let selectedResource = store[currentLang];
            // 2. 現在の選択言語が無ければ、フォールバック言語 (FALLBACK_LANG = 'en') を適用
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
