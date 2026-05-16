import { it, expect, describe } from 'vitest';
import { DataManager } from '../../../../src/lib/core/dataManager.js';
import { setAppVersion } from '../../../../src/lib/utils/env.js';

export const testDataManager = () => {
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

    // window.localStorage を差し替える
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

    // Set App Version via utility
    setAppVersion("1.0.0");

    try {
        localStorage.clear();
        const migrationMap = {
            init: () => ({ score: 0 })
        };
        
        // 1. Init
        const data = DataManager.getSavedData('test_key', migrationMap);
        results.push({ name: 'DataManager: Init calls migrationMap.init', pass: data.score === 0 });
        
        // 2. Storage format (v/d)
        data.score = 50;
        DataManager.setSavedData('test_key', data);
        const raw = JSON.parse(localStorage.getItem('test_key'));
        results.push({ name: 'DataManager: Storage uses v/d wrapper', pass: (raw.v === 1 && raw.d.score === 50) });
        
        // 3. Migration
        localStorage.clear();
        localStorage.setItem('migrate_test', JSON.stringify({ v: 0, d: { val: 10 } }));
        const mapWithMigration = {
            init: () => ({ val: 0 }),
            1: (d) => ({ val: d.val * 2 })
        };
        const migrated = DataManager.getSavedData('migrate_test', mapWithMigration);
        results.push({ name: 'DataManager: Migration applies correctly', pass: migrated.val === 20 });

    } catch (e) {
        results.push({ name: 'DataManager tests', pass: false, error: e.message });
    } finally {
        // 元に戻す
        Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
    }

    return results;
};

describe('DataManager', () => {
    it('should pass all implementation tests', () => {
        const results = testDataManager();
        results.forEach(res => {
            expect(res.pass, `${res.name}: ${res.error}`).toBe(true);
        });
    });
});
