(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const o of e)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function t(e){const o={};return e.integrity&&(o.integrity=e.integrity),e.referrerPolicy&&(o.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?o.credentials="include":e.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(e){if(e.ep)return;e.ep=!0;const o=t(e);fetch(e.href,o)}})();const c=async(r,n={})=>{const t=await fetch(r,n);if(!t.ok)throw new Error(`CommonFetch: Failed to fetch "${r}". Status: ${t.status} ${t.statusText}`);try{return await t.json()}catch{throw new Error(`CommonFetch: Failed to parse JSON from "${r}".`)}};async function d(){await m(),p()}async function m(){const r=document.getElementById("gamesGrid");r.innerHTML='<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">Loading projects...</div>';try{const n=await c("data/project_list.json"),t=await Promise.all(n.map(async s=>{try{const e=await c(`data/projects/${s}.json`);if(e.id=s,e.logo&&e.logo.path)try{const o=await fetch(e.logo.path);o.ok&&(e.logo.content=await o.text())}catch(o){console.warn(`Failed to inline logo for ${s}:`,o)}return e}catch(e){return console.error(`Failed to load project data for ${s}:`,e),null}}));u(t.filter(s=>s!==null))}catch(n){console.error("Critical error loading projects:",n),r.innerHTML='<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--secondary);">データの読み込みに失敗しました。</div>'}}function u(r){const n=document.getElementById("gamesGrid");n.innerHTML=r.map((t,s)=>{const e=t.logo.content?`<div class="game-logo-wrapper" style="--logo-height: ${t.logo.style.height||"40px"}; ${Object.entries(t.logo.style).filter(([a])=>a!=="height").map(([a,l])=>`${a}:${l}`).join(";")}">${t.logo.content}</div>`:`<h3>${t.title}</h3>`,o=t.button,i=t.status;return`
        <div class="game-card animate-fade" style="--delay: ${.2*(s+1)}s">
            <div class="game-img" style="--bg-image: url('${t.image}')">
                <div class="game-title-overlay">
                    ${e}
                </div>
                <span class="badge" style="${Object.entries(i.style||{}).map(([a,l])=>`${a}:${l}`).join(";")}">${i.content}</span>
            </div>
            <div class="game-info">
                <div class="tags">
                    ${t.tags.map(a=>`<span class="tag">${a}</span>`).join("")}
                </div>
                <p>${t.description}</p>
                <div class="btn-group" style="flex-direction: column; align-items: stretch; gap: 0.5rem;">
                    <button class="history-link" style="align-self: flex-end; margin-bottom: 0.2rem;" data-project-id="${t.id}">Update History</button>
                    <a href="${o.disabled?"javascript:void(0)":o.url}" 
                       class="btn-more ${o.disabled?"disabled":""}" 
                       ${o.disabled?'onclick="return false;"':""}
                       style="${Object.entries(o.style||{}).map(([a,l])=>`${a}:${l}`).join(";")}">
                       ${o.content}
                    </a>
                </div>
            </div>
        </div>
        `}).join(""),n.querySelectorAll(".history-link").forEach(t=>{t.addEventListener("click",()=>y(t.dataset.projectId))}),g()}function g(){const r={threshold:.1},n=new IntersectionObserver(t=>{t.forEach(s=>{s.isIntersecting&&s.target.classList.add("visible")})},r);document.querySelectorAll(".animate-fade").forEach(t=>{n.observe(t)})}async function y(r){const n=document.getElementById("modalOverlay"),t=document.getElementById("modalTitle"),s=document.getElementById("modalBody");t.textContent="Update History",s.innerHTML='<div class="loading-spinner">Loading history...</div>',n.classList.add("active");try{const e=await c(`data/projects/${r}.json`);t.textContent=`${e.title} - Update History`;const o=e.button.url.endsWith("/")?e.button.url:e.button.url+"/",i=e.button.url.includes(".json")?e.button.url:o+"update_history.json",a=await c(i);f(a,s)}catch(e){s.innerHTML=`
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <p>現在、更新履歴は公開されていません。</p>
                <p style="font-size: 0.8rem; margin-top: 1rem;">(${e.message})</p>
            </div>
        `}}function f(r,n){if(!r||r.length===0){n.innerHTML="<p>No history available.</p>";return}n.innerHTML=r.map(t=>`
        <div class="history-item">
            <div class="history-header">
                <span class="history-version">v${t.version}</span>
                <span class="history-date">${t.date}</span>
            </div>
            <div class="history-title">${t.title}</div>
            ${t.description?`<p style="margin-bottom: 0.5rem; font-size: 0.9rem;">${t.description}</p>`:""}
            <ul class="history-changes">
                ${t.changes.map(s=>`<li>${s}</li>`).join("")}
            </ul>
        </div>
    `).join("")}function p(){const r=document.querySelector("header"),n=document.getElementById("logo-cog-1"),t=document.getElementById("logo-cog-2"),s=document.getElementById("modalOverlay"),e=document.getElementById("modalClose");window.addEventListener("scroll",()=>{const o=window.scrollY;o>50?r.classList.add("scrolled"):r.classList.remove("scrolled");const i=o*.5;n&&n.setAttribute("transform",`rotate(${i}, 110.72, 23.20)`),t&&t.setAttribute("transform",`matrix(0.17386665, 0.04658743, -0.04658743, 0.17386665, 124.54416, 18.909185) rotate(${-i}, 100, 100)`)}),e.addEventListener("click",()=>{s.classList.remove("active")}),s.addEventListener("click",o=>{o.target===s&&s.classList.remove("active")})}document.addEventListener("DOMContentLoaded",d);
