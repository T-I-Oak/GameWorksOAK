import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../src/lib');
const destDir = path.resolve(__dirname, '../dist/lib');

/**
 * ディレクトリを再帰的にコピーする関数
 */
function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`[copy-lib] Warning: Source directory not found: ${src}`);
        return;
    }

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('[copy-lib] Starting copy: src/lib -> dist/lib');
try {
    copyRecursive(srcDir, destDir);
    console.log('[copy-lib] Copy completed successfully.');
} catch (err) {
    console.error('[copy-lib] Error during copy:', err);
    process.exit(1);
}
