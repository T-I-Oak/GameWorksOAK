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
        
        // 1. Init (Static)
        const data = DataManager.getSavedData('test_key', migrationMap);
        results.push({ name: 'DataManager (Static): Init calls migrationMap.init', pass: data.score === 0 });
        
        // 2. Storage format (v/d) (Static)
        data.score = 50;
        DataManager.setSavedData('test_key', data);
        const raw = JSON.parse(localStorage.getItem('test_key'));
        results.push({ name: 'DataManager (Static): Storage uses v/d wrapper', pass: (raw.v === 1 && raw.d.score === 50) });
        
        // 3. Migration (Static)
        localStorage.clear();
        localStorage.setItem('migrate_test', JSON.stringify({ v: 0, d: { val: 10 } }));
        const mapWithMigration = {
            init: () => ({ val: 0 }),
            1: (d) => ({ val: d.val * 2 })
        };
        const migrated = DataManager.getSavedData('migrate_test', mapWithMigration);
        results.push({ name: 'DataManager (Static): Migration applies correctly', pass: migrated.val === 20 });

        // 4. Instance features (gameId namespace)
        localStorage.clear();
        const manager = new DataManager('gameA');
        
        // 4.1. getValue/setValue
        manager.setValue('score', 100);
        const rawGameA = JSON.parse(localStorage.getItem('gameA'));
        results.push({ name: 'DataManager (Instance): setValue writes to gameId key in localStorage', pass: (rawGameA && rawGameA.score === 100) });
        results.push({ name: 'DataManager (Instance): getValue reads from cache', pass: manager.getValue('score') === 100 });

        // 4.2. getSavedData / setSavedData migration (Instance)
        const instMigrationMap = {
            init: () => ({ coins: 10 }),
            1: (d) => ({ coins: d.coins + 5 })
        };
        
        // Initial getSavedData on instance
        const instData = manager.getSavedData('user_wallet', instMigrationMap);
        results.push({ name: 'DataManager (Instance): getSavedData initializes inside namespace', pass: instData.coins === 10 });
        
        // Modify & save via instance
        instData.coins = 20;
        manager.setSavedData('user_wallet', instData);
        
        // Check raw storage layout inside gameId
        const updatedGameA = JSON.parse(localStorage.getItem('gameA'));
        results.push({ 
            name: 'DataManager (Instance): setSavedData stores in v/d wrapper inside namespace', 
            pass: (updatedGameA.user_wallet.v === 1 && updatedGameA.user_wallet.d.coins === 20) 
        });

        // Migration inside instance
        // Force mock version down and test migration
        updatedGameA.user_wallet.v = 0; // version 0
        updatedGameA.user_wallet.d.coins = 15; // coins 15
        localStorage.setItem('gameA', JSON.stringify(updatedGameA));
        
        // Re-instantiate to simulate reload
        const reloadManager = new DataManager('gameA');
        const migratedInstData = reloadManager.getSavedData('user_wallet', instMigrationMap);
        results.push({ 
            name: 'DataManager (Instance): getSavedData migrates nested version correctly', 
            pass: migratedInstData.coins === 20 // 15 + 5 (migration for v1)
        });

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
