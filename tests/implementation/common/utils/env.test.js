import { getAppVersion, getMajorVersion } from '../../../../src/common/utils/env.js';

export const testEnv = () => {
    const results = [];
    
    // Mock __APP_VERSION__
    window.__APP_VERSION__ = "1.2.3";

    try {
        const version = getAppVersion();
        results.push({ name: 'getAppVersion returns string', pass: version === "1.2.3" });
        
        const major = getMajorVersion();
        results.push({ name: 'getMajorVersion returns number', pass: major === 1 });
    } catch (e) {
        results.push({ name: 'Env tests', pass: false, error: e.message });
    }

    return results;
};
