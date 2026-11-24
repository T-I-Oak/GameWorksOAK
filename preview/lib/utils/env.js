/**
 * アプリケーションの環境・ビルド情報を取得するユーティリティ
 */

let _appVersion;

/**
 * アプリケーションのバージョンを設定します。
 * @param {string} v バージョン文字列
 */
export const setAppVersion = (v) => {
    _appVersion = v;
};

/**
 * 設定されたアプリのバージョン文字列を返します。
 * @returns {string} バージョン文字列 (例: "1.2.3")
 */
export const getAppVersion = () => {
    return _appVersion;
};

/**
 * アプリのメジャーバージョンを数値として返します。
 * @returns {number} メジャーバージョン
 */
export const getMajorVersion = () => {
    const version = getAppVersion();
    return parseInt(version.split('.')[0], 10);
};
