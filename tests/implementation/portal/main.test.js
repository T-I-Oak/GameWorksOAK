import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showHistory } from '../../../src/portal/main.js';

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

    it('should fetch update_history.json from the data/ folder', async () => {
        const projectId = 'burst-cascade';
        const projectData = {
            title: 'Burst Cascade',
            button: {
                url: 'https://example.com/BurstCascade/'
            }
        };

        // 1回目の fetch (プロジェクトデータ)
        commonFetch.mockResolvedValueOnce(projectData);
        // 2回目の fetch (更新履歴)
        commonFetch.mockResolvedValueOnce([
            { version: '0.1', date: '2026-05-16', content: [{ type: 'new', text: 'test' }] }
        ]);

        await showHistory(projectId);

        // プロジェクトデータの取得を確認
        expect(commonFetch).toHaveBeenCalledWith(`data/projects/${projectId}.json`);

        // 更新履歴の取得パスを確認 (data/ フォルダが含まれているか)
        expect(commonFetch).toHaveBeenCalledWith('https://example.com/BurstCascade/data/update_history.json');
    });

    it('should handle project URLs without trailing slash', async () => {
        const projectId = 'test-project';
        const projectData = {
            title: 'Test Project',
            button: {
                url: 'https://example.com/TestProject'
            }
        };

        commonFetch.mockResolvedValueOnce(projectData);
        commonFetch.mockResolvedValueOnce([]);

        await showHistory(projectId);

        expect(commonFetch).toHaveBeenCalledWith('https://example.com/TestProject/data/update_history.json');
    });
});
