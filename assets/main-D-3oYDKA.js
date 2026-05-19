(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))n(e);new MutationObserver(e=>{for(const s of e)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function t(e){const s={};return e.integrity&&(s.integrity=e.integrity),e.referrerPolicy&&(s.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?s.credentials="include":e.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(e){if(e.ep)return;e.ep=!0;const s=t(e);fetch(e.href,s)}})();const m=async(o,i={})=>{const t=await fetch(o,i);if(!t.ok)throw new Error(`CommonFetch: Failed to fetch "${o}". Status: ${t.status} ${t.statusText}`);try{return await t.json()}catch{throw new Error(`CommonFetch: Failed to parse JSON from "${o}".`)}};async function p(){const o=document.getElementById("portal-version");o&&(o.textContent="v0.11.0"),await y(),L()}async function y(){const o=document.getElementById("gamesGrid");o.innerHTML='<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">Loading projects...</div>';const i=await m("data/project_list.json"),t=await Promise.all(i.map(async n=>{const e=n.id,s=n.title,r=`https://t-i-oak.github.io/${e}/`;let a=null;const l=u("data/project_info.json",r);try{const c=await fetch(l);c.ok&&(a=await c.json(),a.isMaintenance=!1)}catch{}if(!a)a={id:e,title:s,isMaintenance:!0,image:"",badge:{content:"",type:"none"},tags:["データ取得不可"],description:"プロジェクト情報の取得に失敗しました。一時的なメンテナンス中か、ネットワーク環境に問題がある可能性があります。",button:{content:"UNAVAILABLE",url:"javascript:void(0)",type:"pending"}};else if(a.id=e,a.button?a.button.url||(a.button.url=r):a.button={url:r,content:"PLAY NOW",type:"published"},a.image&&(a.image=u(a.image,r)),a.logo&&a.logo.path){const c=u(a.logo.path,r),d=await fetch(c);d.ok&&(a.logo.content=await d.text())}return a}));v(t.filter(n=>n!==null))}function v(o){const i=document.getElementById("gamesGrid");i.innerHTML=o.map((t,n)=>{const e=t.logo,s=t.badge,r=t.button,a=t.isMaintenance;let l="";e&&e.content?l=`<div class="game-logo-wrapper Logo${e.type?e.type.charAt(0).toUpperCase()+e.type.slice(1):"Standard"}">${e.content}</div>`:l=`<div class="game-logo-wrapper LogoText"><h3>${t.title}</h3></div>`;const c=r.type==="pending"||a,d=c?"javascript:void(0)":r.url,f=c?'onclick="return false;"':"";return`
        <div class="game-card ${a?"state-maintenance":""} animate-fade" style="--delay: ${.2*(n+1)}s">
            <div class="game-img" style="--bg-image: url('${t.image}')">
                <div class="game-title-overlay">
                    ${l}
                </div>
                <span class="badge texture-${s.type}">${s.content}</span>
            </div>
            <div class="game-info">
                <div class="tags">
                    ${t.tags.map(g=>`<span class="tag">${g}</span>`).join("")}
                </div>
                <p>${t.description}</p>
                <div class="btn-group">
                    <button class="history-link" 
                            data-project-id="${t.id}"
                            ${a?"disabled":""}>
                        Update History
                    </button>
                    <a href="${d}" 
                       class="btn-more state-${r.type}" 
                       ${c?"":'target="_blank" rel="noopener noreferrer"'}
                       ${f}>
                       ${r.content}
                    </a>
                </div>
            </div>
        </div>
        `}).join(""),i.querySelectorAll(".history-link").forEach(t=>{t.addEventListener("click",()=>b(t.dataset.projectId))}),h()}function h(){const o={threshold:.1},i=new IntersectionObserver(t=>{t.forEach(n=>{n.isIntersecting&&n.target.classList.add("visible")})},o);document.querySelectorAll(".animate-fade").forEach(t=>{i.observe(t)})}async function b(o){const i=document.getElementById("modalOverlay"),t=document.getElementById("modalTitle"),n=document.getElementById("modalBody");t.textContent="Update History",n.innerHTML='<div class="loading-spinner">Loading history...</div>',i.classList.add("active");try{const s=(await m("data/project_list.json")).find(d=>d.id===o),r=s?s.title:o;t.textContent=`${r} - Update History`;const a=`https://t-i-oak.github.io/${o}/`,l=u("data/update_history.json",a),c=await m(l);$(c,n)}catch(e){throw n.innerHTML=`
            <div class="modal-placeholder">
                <p>- 準備中 -</p>
            </div>
        `,e}}function $(o,i){if(!o||o.length===0){i.innerHTML="<p>No history available.</p>";return}const t={new:"新機能",imp:"改善",fix:"修正",etc:"その他"};i.innerHTML=o.map(n=>`
        <div class="history-item">
            <div class="history-header">
                <span class="history-version">v${n.version}</span>
                <span class="history-date">${n.date}</span>
            </div>
            <ul class="history-changes">
                ${n.content.map(e=>{const s=t[e.type];return`<li><span class="history-tag tag-${e.type}">${s}</span>${e.text}</li>`}).join("")}
            </ul>
        </div>
    `).join("")}function L(){const o=document.querySelector("header"),i=document.getElementById("logo-cog-1"),t=document.getElementById("logo-cog-2"),n=document.getElementById("modalOverlay"),e=document.getElementById("modalClose");window.addEventListener("scroll",()=>{const s=window.scrollY;s>50?o.classList.add("scrolled"):o.classList.remove("scrolled");const r=s*.5;i&&i.setAttribute("transform",`rotate(${r}, 110.72, 23.20)`),t&&t.setAttribute("transform",`matrix(0.17386665, 0.04658743, -0.04658743, 0.17386665, 124.54416, 18.909185) rotate(${-r}, 100, 100)`)}),e.addEventListener("click",()=>{n.classList.remove("active")}),n.addEventListener("click",s=>{s.target===n&&n.classList.remove("active")})}function u(o,i){if(!o)return"";if(o.startsWith("http://")||o.startsWith("https://")||!i)return o;let t=i;if(!t.endsWith("/"))try{const e=new URL(t).pathname;e.substring(e.lastIndexOf("/")+1).includes(".")||(t=t+"/")}catch{}try{return new URL(o,t).href}catch{return o}}document.addEventListener("DOMContentLoaded",p);
