/**
 * アプリケーションの環境・ビルド情報を取得するユーティリティ
 */

/**
 * ビルド時に注入されたアプリのバージョン文字列を返します。
 * @returns {string} バージョン文字列 (例: "1.2.3")
 */
export const getAppVersion = () => {
    return __APP_VERSION__;
};

/**
 * アプリのメジャーバージョンを数値として返します。
 * @returns {number} メジャーバージョン
 */
export const getMajorVersion = () => {
    const version = getAppVersion();
    return parseInt(version.split('.')[0], 10);
};
