import { getMajorVersion } from '../utils/env.js';
import { commonFetch } from '../utils/fetch.js';

/**
 * GameWorks OAK プロジェクト共通のデータ管理クラス
 */
export class DataManager {
    /**
     * @param {string} [gameId] - ゲーム識別子。渡された場合はインスタンスとして動作し、データがgameIdのキー配下にカプセル化されます。
     */
    constructor(gameId) {
        if (gameId) {
            this.gameId = gameId;
            const rawJson = localStorage.getItem(gameId);
            try {
                this.cache = rawJson ? JSON.parse(rawJson) : {};
            } catch (e) {
                this.cache = {};
            }
        }
    }

    /**
     * キャッシュ内の指定キー의 データを単純に返します。
     * @param {string} key - キー
     * @returns {*} データ
     */
    getValue(key) {
        if (!this.cache) return undefined;
        return this.cache[key];
    }

    /**
     * キャッシュの指定キーにデータを保存し、localStorage全体を保存します。
     * @param {string} key - キー
     * @param {*} value - 保存する値
     */
    setValue(key, value) {
        if (!this.gameId || !this.cache) return;
        this.cache[key] = value;
        this.save();
    }

    /**
     * インスタンス用のマイグレーション機能付きデータ取得メソッド。
     * キャッシュ（gameId配下）からデータを取得し、マイグレーションを適用して返します。
     * @param {string} key - 保存キー
     * @param {object} migrationMap - 初期化とマイグレーションの定義
     * @returns {object} データ本体
     */
    getSavedData(key, migrationMap) {
        if (!this.cache) return migrationMap.init();

        let wrapper = this.cache[key];

        if (!wrapper) {
            // データ不在時は初期化
            const initialData = migrationMap.init();
            this.setSavedData(key, initialData);
            return initialData;
        }

        // 期待する構造 (v/d) でない場合は初期化
        if (!wrapper || typeof wrapper !== 'object' || !('v' in wrapper) || !('d' in wrapper)) {
            const initialData = migrationMap.init();
            this.setSavedData(key, initialData);
            return initialData;
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

        // マイグレーション適用後のデータをキャッシュに書き戻す
        wrapper.d = data;
        wrapper.v = currentDataVersion;
        this.save();

        return data;
    }

    /**
     * インスタンス用のマイグレーション機能付きデータ保存メソッド。
     * データをラップしてキャッシュ（gameId配下）に保存し、localStorage全体を保存します。
     * @param {string} key - 保存キー
     * @param {object} data - 保存するデータ本体
     */
    setSavedData(key, data) {
        if (!this.gameId || !this.cache) return;
        this.cache[key] = {
            v: getMajorVersion(),
            d: data
        };
        this.save();
    }

    /**
     * キャッシュデータ全体を localStorage にシリアライズ保存します。
     */
    save() {
        if (!this.gameId || !this.cache) return;
        localStorage.setItem(this.gameId, JSON.stringify(this.cache));
    }

    // --- 静的メソッド (後方互換性維持のため) ---

    /**
     * ローカルストレージからデータを取得し、マイグレーションを適用して返します。
     * @param {string} key - 保存キー
     * @param {object} migrationMap - 初期化とマイグレーションの定義
     * @returns {object} データ本体
     */
    static getSavedData(key, migrationMap) {
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
    }

    /**
     * データをラップしてローカルストレージに保存します。
     * @param {string} key - 保存キー
     * @param {object} data - 保存するデータ本体
     */
    static setSavedData(key, data) {
        const wrapper = {
            v: getMajorVersion(),
            d: data
        };
        localStorage.setItem(key, JSON.stringify(wrapper));
    }

    /**
     * プロジェクトの data/ フォルダからデータを取得します。
     * @param {string} path - data/ 配下の相対パス
     * @returns {Promise<object>} JSON データ
     */
    static async fetchGameData(path) {
        const url = `./data/${path}`;
        return await commonFetch(url);
    }
}
