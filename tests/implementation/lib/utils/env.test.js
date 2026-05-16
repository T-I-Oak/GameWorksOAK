import { it, expect, describe } from 'vitest';
import { getAppVersion, getMajorVersion, setAppVersion } from '../../../../src/lib/utils/env.js';

describe('Env Utils (Implementation)', () => {
    it('初期状態（未設定）では undefined を返す', () => {
        // 注: 他のテストの影響を避けるため、明示的に undefined をセットしてテスト
        setAppVersion(undefined);
        expect(getAppVersion()).toBeUndefined();
    });

    it('setAppVersion で設定したバージョンを取得できる', () => {
        setAppVersion('1.2.3');
        expect(getAppVersion()).toBe('1.2.3');
    });

    it('getMajorVersion がメジャーバージョンを数値で返す', () => {
        setAppVersion('3.4.5');
        expect(getMajorVersion()).toBe(3);
    });

    it('未設定時に getMajorVersion を呼ぶと自然に TypeError が発生する', () => {
        setAppVersion(undefined);
        // undefined.split('.') が実行されるため、TypeError が発生するはず
        expect(() => getMajorVersion()).toThrow(TypeError);
    });
});
