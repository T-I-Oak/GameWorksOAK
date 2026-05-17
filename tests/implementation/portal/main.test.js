import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showHistory, resolveAbsoluteUrl } from '../../../src/portal/main.js';

// DOM のモック
document.body.innerHTML = `
    <div id="modalOverlay">
        <div id="modalTitle"></div>
        <div id="modalBody"></div>
    </div>
`;

// commonFetch のモックが必要だが、main.js で import されているので vi.mock を使う
vi.mock('../../../src/lib/utils/fetch.js', () => ({
    commonFetch: vi.fn()
}));

import { commonFetch } from '../../../src/lib/utils/fetch.js';

describe('portal main.js - showHistory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch update_history.json directly from standard remote path using manifest title', async () => {
        const projectId = 'BurstCascade';
        const manifestData = [
            { id: 'BurstCascade', title: 'Burst Cascade' }
        ];

        // 1回目の fetch (マニフェスト)
        commonFetch.mockResolvedValueOnce(manifestData);
        // 2回目の fetch (更新履歴)
        commonFetch.mockResolvedValueOnce([
            { version: '0.1', date: '2026-05-16', content: [{ type: 'new', text: 'test' }] }
        ]);

        await showHistory(projectId);

        // マニフェストの取得を確認
        expect(commonFetch).toHaveBeenCalledWith('data/project_list.json');

        // 更新履歴の取得パスが共通仕様に準拠しているか確認
        expect(commonFetch).toHaveBeenCalledWith('https://t-i-oak.github.io/BurstCascade/data/update_history.json');
    });
});

describe('portal main.js - resolveAbsoluteUrl', () => {
    it('should return empty string if path is empty', () => {
        expect(resolveAbsoluteUrl('', 'https://example.com')).toBe('');
        expect(resolveAbsoluteUrl(null, 'https://example.com')).toBe('');
    });

    it('should return the path unchanged if it is already an absolute URL', () => {
        expect(resolveAbsoluteUrl('https://other.com/logo.svg', 'https://example.com/')).toBe('https://other.com/logo.svg');
        expect(resolveAbsoluteUrl('http://other.com/logo.svg', 'https://example.com/')).toBe('http://other.com/logo.svg');
    });

    it('should resolve root-relative paths against the origin of the base URL', () => {
        expect(resolveAbsoluteUrl('/assets/logo.svg', 'https://example.com/project/')).toBe('https://example.com/assets/logo.svg');
        expect(resolveAbsoluteUrl('/GameWorksOAK/assets/logo.svg', 'http://localhost:3000/GameWorksOAK/')).toBe('http://localhost:3000/GameWorksOAK/assets/logo.svg');
    });

    it('should resolve relative paths against directory base URL with trailing slash', () => {
        expect(resolveAbsoluteUrl('assets/logo.svg', 'https://example.com/project/')).toBe('https://example.com/project/assets/logo.svg');
    });

    it('should resolve relative paths against directory base URL without trailing slash', () => {
        expect(resolveAbsoluteUrl('assets/logo.svg', 'https://example.com/project')).toBe('https://example.com/project/assets/logo.svg');
    });

    it('should resolve relative paths against base URL containing filename', () => {
        expect(resolveAbsoluteUrl('assets/logo.svg', 'https://example.com/project/index.html')).toBe('https://example.com/project/assets/logo.svg');
    });
});
