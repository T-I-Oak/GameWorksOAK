import { describe, it, expect } from 'vitest';
import { getProjectBaseUrl, resolveProjectUrl, isPreview } from '../../../src/portal/projectUrls.js';

describe('project environment URLs', () => {
    it('uses only the exact query value on, independently of portal path', () => {
        for (const search of ['', '?preview=off', '?preview=true', '?preview=ON']) {
            expect(isPreview(search)).toBe(false);
            expect(getProjectBaseUrl('Game', search)).toBe('https://t-i-oak.github.io/Game/');
        }
        expect(getProjectBaseUrl('Game', '?lang=en&preview=on')).toBe('https://t-i-oak.github.io/Game/preview/');
    });
    it('aligns relative and own absolute URLs while preserving external links and suffixes', () => {
        const base = getProjectBaseUrl('Game', '?preview=on');
        for (const path of ['assets/a.svg', '/Game/assets/a.svg', 'https://t-i-oak.github.io/Game/assets/a.svg']) {
            expect(resolveProjectUrl(path, base)).toBe(base + 'assets/a.svg');
        }
        expect(resolveProjectUrl('https://t-i-oak.github.io/Game/preview/play.html?q=1#go', getProjectBaseUrl('Game', '')))
            .toBe('https://t-i-oak.github.io/Game/play.html?q=1#go');
        expect(resolveProjectUrl('./?mode=1#go', base)).toBe(base + '?mode=1#go');
        expect(resolveProjectUrl('https://example.com/play', base)).toBe('https://example.com/play');
        expect(resolveProjectUrl('https://t-i-oak.github.io/Other/play', base)).toBe('https://t-i-oak.github.io/Other/play');
    });
});
