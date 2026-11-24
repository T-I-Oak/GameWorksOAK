// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { deploymentTarget } from '../../scripts/deployment.js';
describe('deployment policy', () => {
    it('maps master push and development dispatch to fixed destinations', () => {
        expect(deploymentTarget('push', 'refs/heads/master', 'T-I-Oak/Game')).toEqual({base: '/Game/', target: ''});
        expect(deploymentTarget('workflow_dispatch', 'refs/heads/feature/test', 'T-I-Oak/Game')).toEqual({base: '/Game/preview/', target: 'preview'});
    });
    it('rejects events and refs that cannot publish', () => {
        for (const [event, ref] of [['push','refs/heads/feature/test'], ['workflow_dispatch','refs/heads/master'], ['workflow_dispatch','refs/tags/v1'], ['pull_request','refs/heads/master']]) {
            expect(() => deploymentTarget(event, ref, 'T-I-Oak/Game')).toThrow();
        }
    });
});

describe('build destination validation', () => {
    it('accepts matching assets and rejects wrong base and reserved preview output', () => {
        const dir = mkdtempSync(join(tmpdir(), 'gameworksoak-deploy-'));
        mkdirSync(join(dir, 'dist'));
        const file = join(dir, 'dist/index.html');
        const run = () => spawnSync(process.execPath, [resolve('scripts/deployment.js'), 'verify'], {
            cwd: dir, env: { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/master',
                GITHUB_REPOSITORY: 'T-I-Oak/Game', DEPLOY_BASE_PATH: '/Game/' }, encoding: 'utf8'
        });
        try {
            writeFileSync(file, '<script src="/Game/assets/main.js"></script>');
            expect(run().status).toBe(0);
            writeFileSync(file, '<script src="/Game/preview/assets/main.js"></script>');
            expect(run().status).not.toBe(0);
            writeFileSync(file, '<script src="/Game/assets/main.js"></script>');
            mkdirSync(join(dir, 'dist/preview'));
            expect(run().status).not.toBe(0);
            rmdirSync(join(dir, 'dist/preview'));
        } finally {
            unlinkSync(file);
            rmdirSync(join(dir, 'dist'));
            rmdirSync(dir);
        }
    });
});
