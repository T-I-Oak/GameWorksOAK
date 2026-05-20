(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))n(t);new MutationObserver(t=>{for(const s of t)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function o(t){const s={};return t.integrity&&(s.integrity=t.integrity),t.referrerPolicy&&(s.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?s.credentials="include":t.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(t){if(t.ep)return;t.ep=!0;const s=o(t);fetch(t.href,s)}})();const m=async(e,i={})=>{const o=await fetch(e,i);if(!o.ok)throw new Error(`CommonFetch: Failed to fetch "${e}". Status: ${o.status} ${o.statusText}`);try{return await o.json()}catch{throw new Error(`CommonFetch: Failed to parse JSON from "${e}".`)}};async function y(){const e=document.getElementById("portal-version");e&&(e.textContent="v0.12.1"),await v(),w()}async function v(){const e=document.getElementById("gamesGrid");e.innerHTML='<div class="LoadingProjects">Loading projects...</div>';const i=await m("data/project_list.json"),o=await Promise.all(i.map(async n=>{const t=n.id,s=n.title,r=`https://t-i-oak.github.io/${t}/`;let a=null;const l=u("data/project_info.json",r);try{const c=await fetch(l);c.ok&&(a=await c.json(),a.isMaintenance=!1)}catch{}if(!a)a={id:t,title:s,isMaintenance:!0,image:"",badge:{content:"",type:"none"},tags:["データ取得不可"],description:"プロジェクト情報の取得に失敗しました。一時的なメンテナンス中か、ネットワーク環境に問題がある可能性があります。",button:{content:"UNAVAILABLE",url:"javascript:void(0)",type:"pending"}};else if(a.id=t,a.button?a.button.url||(a.button.url=r):a.button={url:r,content:"PLAY NOW",type:"published"},a.image&&(a.image=u(a.image,r)),a.logo&&a.logo.path){const c=u(a.logo.path,r);if(a.logo.path=c,E(c)){const d=await fetch(c);d.ok&&(a.logo.content=await d.text())}}return a}));h(o.filter(n=>n!==null))}function h(e){const i=document.getElementById("gamesGrid");i.innerHTML=e.map((o,n)=>{const t=o.logo,s=o.badge,r=o.button,a=o.isMaintenance;let l="";t&&t.content?l=`<div class="GameLogoWrapper Logo${t.type?t.type.charAt(0).toUpperCase()+t.type.slice(1):"Standard"}">${t.content}</div>`:t&&t.path&&H(t.path)?l=`<div class="GameLogoWrapper Logo${t.type?t.type.charAt(0).toUpperCase()+t.type.slice(1):"Standard"}"><img class="GameLogoImg" src="${t.path}" alt="${o.title} logo"></div>`:l=`<div class="GameLogoWrapper LogoText"><h3>${o.title}</h3></div>`;const c=r.type==="pending"||a,d=c?"javascript:void(0)":r.url,f=c?'onclick="return false;"':"";return`
        <div class="GameCard ${a?"state-maintenance":""} animate-fade" style="--delay: ${.2*(n+1)}s">
            <div class="GameImg" style="--bg-image: url('${o.image}')">
                <div class="GameTitleOverlay">
                    ${l}
                </div>
                <span class="badge texture-${s.type}">${s.content}</span>
            </div>
            <div class="GameInfo">
                <div class="tags">
                    ${o.tags.map(p=>`<span class="tag">${p}</span>`).join("")}
                </div>
                <p>${o.description}</p>
                <div class="BtnGroup">
                    <button class="HistoryLink" 
                            data-project-id="${o.id}"
                            ${a?"disabled":""}>
                        Update History
                    </button>
                    <a href="${d}" 
                       class="BtnMore state-${r.type}" 
                       ${c?"":'target="_blank" rel="noopener noreferrer"'}
                       ${f}>
                       ${r.content}
                    </a>
                </div>
            </div>
        </div>
        `}).join(""),i.querySelectorAll(".HistoryLink").forEach(o=>{o.addEventListener("click",()=>b(o.dataset.projectId))}),L()}function L(){const e={threshold:.1},i=new IntersectionObserver(o=>{o.forEach(n=>{n.isIntersecting&&n.target.classList.add("visible")})},e);document.querySelectorAll(".animate-fade").forEach(o=>{i.observe(o)})}async function b(e){const i=document.getElementById("modalOverlay"),o=document.getElementById("modalTitle"),n=document.getElementById("modalBody");o.textContent="Update History",n.innerHTML='<div class="LoadingSpinner">Loading history...</div>',i.classList.add("active");try{const s=(await m("data/project_list.json")).find(d=>d.id===e),r=s?s.title:e;o.textContent=`${r} - Update History`;const a=`https://t-i-oak.github.io/${e}/`,l=u("data/update_history.json",a),c=await m(l);$(c,n)}catch(t){throw n.innerHTML=`
            <div class="ModalPlaceholder">
                <p>- 準備中 -</p>
            </div>
        `,t}}function $(e,i){if(!e||e.length===0){i.innerHTML="<p>No history available.</p>";return}const o={new:"新機能",imp:"改善",fix:"修正",etc:"その他"};i.innerHTML=e.map(n=>`
        <div class="HistoryItem">
            <div class="HistoryHeader">
                <span class="HistoryVersion">v${n.version}</span>
                <span class="HistoryDate">${n.date}</span>
            </div>
            <ul class="HistoryChanges">
                ${n.content.map(t=>{const s=o[t.type];return`<li><span class="HistoryTag tag-${t.type}">${s}</span>${t.text}</li>`}).join("")}
            </ul>
        </div>
    `).join("")}function w(){const e=document.querySelector("header"),i=document.getElementById("logo-cog-1"),o=document.getElementById("logo-cog-2"),n=document.getElementById("modalOverlay"),t=document.getElementById("modalClose");window.addEventListener("scroll",()=>{const s=window.scrollY;s>50?e.classList.add("scrolled"):e.classList.remove("scrolled");const r=s*.5;i&&i.setAttribute("transform",`rotate(${r}, 110.72, 23.20)`),o&&o.setAttribute("transform",`matrix(0.17386665, 0.04658743, -0.04658743, 0.17386665, 124.54416, 18.909185) rotate(${-r}, 100, 100)`)}),t.addEventListener("click",()=>{n.classList.remove("active")}),n.addEventListener("click",s=>{s.target===n&&n.classList.remove("active")})}function u(e,i){if(!e)return"";if(e.startsWith("http://")||e.startsWith("https://")||!i)return e;let o=i;if(!o.endsWith("/"))try{const t=new URL(o).pathname;t.substring(t.lastIndexOf("/")+1).includes(".")||(o=o+"/")}catch{}try{return new URL(e,o).href}catch{return e}}function g(e){if(!e)return"";try{return new URL(e,"https://example.invalid/").pathname.split(".").pop().toLowerCase()}catch{return e.split(/[?#]/)[0].split(".").pop().toLowerCase()}}function E(e){return g(e)==="svg"}function H(e){return["png","jpg","jpeg","webp"].includes(g(e))}document.addEventListener("DOMContentLoaded",y);
