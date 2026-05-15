import { getMajorVersion } from '../utils/env.js';
import { commonFetch } from '../utils/fetch.js';

/**
 * GameWorks OAK プロジェクト共通のデータ管理クラス
 */
export const DataManager = {
    /**
     * ローカルストレージからデータを取得し、マイグレーションを適用して返します。
     * @param {string} key - 保存キー
     * @param {object} migrationMap - 初期化とマイグレーションの定義
     * @returns {object} データ本体
     */
    getSavedData(key, migrationMap) {
        const rawJson = localStorage.getItem(key);
        let wrapper;

        if (!rawJson) {
            // データ不在時は初期化
            return migrationMap.init();
        }

        try {
            wrapper = JSON.parse(rawJson);
        } catch (e) {
            return migrationMap.init();
        }

        // 期待する構造 (v/d) でない場合は初期化
        if (!wrapper || typeof wrapper !== 'object' || !('v' in wrapper) || !('d' in wrapper)) {
            return migrationMap.init();
        }

        // マイグレーションの実行
        let data = wrapper.d;
        let currentDataVersion = wrapper.v;
        const appVersion = getMajorVersion();

        // バージョン番号を取り出し、昇順にソート
        const versions = Object.keys(migrationMap)
            .filter(k => k !== 'init')
            .map(Number)
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b);

        for (const v of versions) {
            if (currentDataVersion < v && v <= appVersion) {
                data = migrationMap[v](data);
                currentDataVersion = v;
            }
        }

        return data;
    },

    /**
     * データをラップしてローカルストレージに保存します。
     * @param {string} key - 保存キー
     * @param {object} data - 保存するデータ本体
     */
    setSavedData(key, data) {
        const wrapper = {
            v: getMajorVersion(),
            d: data
        };
        localStorage.setItem(key, JSON.stringify(wrapper));
    },

    /**
     * プロジェクトの data/ フォルダからデータを取得します。
     * @param {string} path - data/ 配下の相対パス
     * @returns {Promise<object>} JSON データ
     */
    async fetchGameData(path) {
        const url = `./data/${path}`;
        return await commonFetch(url);
    }
};
