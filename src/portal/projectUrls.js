export function isPreview(search = window.location.search) {
    return new URLSearchParams(search).get('preview') === 'on';
}

export function getProjectBaseUrl(id, search = window.location.search) {
    return `https://t-i-oak.github.io/${id}/${isPreview(search) ? 'preview/' : ''}`;
}

// 同一ゲームの公開ルートだけを切り替え、外部リンクは保持する。
export function resolveProjectUrl(path, baseUrl) {
    if (!path) return '';
    const base = new URL(baseUrl);
    const root = '/' + base.pathname.split('/')[1] + '/';
    const url = new URL(path, base);
    if (url.origin === base.origin && url.pathname.startsWith(root)) {
        const relative = url.pathname.slice(root.length).replace(/^preview(?:\/|$)/, '');
        url.pathname = base.pathname + relative;
    }
    return url.href;
}
