(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))o(t);new MutationObserver(t=>{for(const n of t)if(n.type==="childList")for(const i of n.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function e(t){const n={};return t.integrity&&(n.integrity=t.integrity),t.referrerPolicy&&(n.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?n.credentials="include":t.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function o(t){if(t.ep)return;t.ep=!0;const n=e(t);fetch(t.href,n)}})();const a=async(r,s={})=>{const e=await fetch(r,s);if(!e.ok)throw new Error(`CommonFetch: Failed to fetch "${r}". Status: ${e.status} ${e.statusText}`);try{return await e.json()}catch{throw new Error(`CommonFetch: Failed to parse JSON from "${r}".`)}};async function p(){await y(),$()}async function y(){const r=document.getElementById("gamesGrid");r.innerHTML='<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">Loading projects...</div>';const s=await a("data/project_list.json"),e=await Promise.all(s.map(async o=>{const t=await a(`data/projects/${o}.json`);if(t.id=o,t.logo&&t.logo.path){const n=await fetch(t.logo.path);n.ok&&(t.logo.content=await n.text())}return t}));f(e.filter(o=>o!==null))}function f(r){const s=document.getElementById("gamesGrid");s.innerHTML=r.map((e,o)=>{const t=e.logo,n=e.badge,i=e.button,c=t.type?t.type.charAt(0).toUpperCase()+t.type.slice(1):"Standard",d=t.content?`<div class="game-logo-wrapper Logo${c}">${t.content}</div>`:`<div class="game-logo-wrapper LogoText"><h3>${e.title}</h3></div>`,l=i.type==="pending",m=l?"javascript:void(0)":i.url,u=l?'onclick="return false;"':"";return`
        <div class="game-card animate-fade" style="--delay: ${.2*(o+1)}s">
            <div class="game-img" style="--bg-image: url('${e.image}')">
                <div class="game-title-overlay">
                    ${d}
                </div>
                <span class="badge texture-${n.type||"none"}">${n.content||""}</span>
            </div>
            <div class="game-info">
                <div class="tags">
                    ${e.tags.map(g=>`<span class="tag">${g}</span>`).join("")}
                </div>
                <p>${e.description}</p>
                <div class="btn-group" style="flex-direction: column; align-items: stretch; gap: 0.5rem;">
                    <button class="history-link" style="align-self: flex-end; margin-bottom: 0.2rem;" data-project-id="${e.id}">Update History</button>
                    <a href="${m}" 
                       class="btn-more state-${i.type||"published"}" 
                       ${u}>
                       ${i.content}
                    </a>
                </div>
            </div>
        </div>
        `}).join(""),s.querySelectorAll(".history-link").forEach(e=>{e.addEventListener("click",()=>h(e.dataset.projectId))}),v()}function v(){const r={threshold:.1},s=new IntersectionObserver(e=>{e.forEach(o=>{o.isIntersecting&&o.target.classList.add("visible")})},r);document.querySelectorAll(".animate-fade").forEach(e=>{s.observe(e)})}async function h(r){const s=document.getElementById("modalOverlay"),e=document.getElementById("modalTitle"),o=document.getElementById("modalBody");e.textContent="Update History",o.innerHTML='<div class="loading-spinner">Loading history...</div>',s.classList.add("active");try{const t=await a(`data/projects/${r}.json`);e.textContent=`${t.title} - Update History`;const n=t.button.url.endsWith("/")?t.button.url:t.button.url+"/",i=t.button.url.includes(".json")?t.button.url:n+"update_history.json",c=await a(i);b(c,o)}catch(t){throw o.innerHTML=`
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <p style="margin-bottom: 1.5rem;">Failed to load update history.</p>
                <button onclick="document.getElementById('modalOverlay').classList.remove('active')" class="btn-more" style="font-size: 0.9rem; padding: 0.6rem 1.2rem;">Close</button>
            </div>
        `,t}}function b(r,s){if(!r||r.length===0){s.innerHTML="<p>No history available.</p>";return}s.innerHTML=r.map(e=>`
        <div class="history-item">
            <div class="history-header">
                <span class="history-version">v${e.version}</span>
                <span class="history-date">${e.date}</span>
            </div>
            <div class="history-title">${e.title}</div>
            ${e.description?`<p style="margin-bottom: 0.5rem; font-size: 0.9rem;">${e.description}</p>`:""}
            <ul class="history-changes">
                ${e.changes.map(o=>`<li>${o}</li>`).join("")}
            </ul>
        </div>
    `).join("")}function $(){const r=document.querySelector("header"),s=document.getElementById("logo-cog-1"),e=document.getElementById("logo-cog-2"),o=document.getElementById("modalOverlay"),t=document.getElementById("modalClose");window.addEventListener("scroll",()=>{const n=window.scrollY;n>50?r.classList.add("scrolled"):r.classList.remove("scrolled");const i=n*.5;s&&s.setAttribute("transform",`rotate(${i}, 110.72, 23.20)`),e&&e.setAttribute("transform",`matrix(0.17386665, 0.04658743, -0.04658743, 0.17386665, 124.54416, 18.909185) rotate(${-i}, 100, 100)`)}),t.addEventListener("click",()=>{o.classList.remove("active")}),o.addEventListener("click",n=>{n.target===o&&o.classList.remove("active")})}document.addEventListener("DOMContentLoaded",p);
