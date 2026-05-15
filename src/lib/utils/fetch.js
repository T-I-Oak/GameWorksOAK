/**
 * 標準の fetch をラップし、共通のエラーハンドリングと自動パースを提供するユーティリティ
 */

/**
 * 指定された URL からデータを取得し、JSON としてパースして返します。
 * @param {string} url - リクエスト先の URL
 * @param {object} [options={}] - fetch 標準のオプション
 * @returns {Promise<object|array>} パースされた JSON データ
 * @throws {Error} HTTP ステータスが 200-299 以外の場合、またはパースに失敗した場合
 */
export const commonFetch = async (url, options = {}) => {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`CommonFetch: Failed to fetch "${url}". Status: ${response.status} ${response.statusText}`);
    }

    try {
        return await response.json();
    } catch (e) {
        throw new Error(`CommonFetch: Failed to parse JSON from "${url}".`);
    }
};
