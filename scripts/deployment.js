import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function deploymentTarget(event, ref, repository) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid repository');
    const name = repository.split('/')[1];
    if (event === 'push' && ref === 'refs/heads/master') return { base: `/${name}/`, target: '' };
    if (event === 'workflow_dispatch' && ref.startsWith('refs/heads/') && ref !== 'refs/heads/master') {
        return { base: `/${name}/preview/`, target: 'preview' };
    }
    throw new Error('Only master push or development branch dispatch can deploy');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { base, target } = deploymentTarget(process.env.GITHUB_EVENT_NAME, process.env.GITHUB_REF, process.env.GITHUB_REPOSITORY);
    if (process.argv[2] === 'verify') {
        if (process.env.DEPLOY_BASE_PATH !== base) throw new Error('Build base mismatch');
        if (existsSync('dist/preview')) throw new Error('dist/preview is reserved');
        const html = readFileSync('dist/index.html', 'utf8');
        const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
        if (!assets.some(url => url.startsWith(base + 'assets/')) || assets.some(url => url.startsWith('/') && (
            !url.startsWith(base) || (target === '' && url.startsWith(base + 'preview/'))
        ))) {
            throw new Error('Build assets do not match deployment base');
        }
    } else {
        appendFileSync(process.env.GITHUB_OUTPUT, `base=${base}\ntarget=${target}\n`);
    }
}
