import{a as e}from"./rolldown-runtime-BYbx6iT9.js";import{a as t,i as n}from"./motion-vendor-D6dzZimz.js";import{c as r,s as i}from"./vendor-UzvFmjAf.js";import{Rt as a,_t as o,an as s,rt as c,vt as l}from"./ui-vendor-DqKsDL0I.js";import{m as u,v as d}from"./index-Cc_JkhaI.js";var f=e(t(),1),p=n();typeof window<`u`&&r.registerPlugin(i);var m=`
.cinematic-footer-wrapper {
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  --footer-accent: #ef4444;
  --footer-pill-bg-1: color-mix(in srgb, var(--foreground) 8%, transparent);
  --footer-pill-bg-2: color-mix(in srgb, var(--foreground) 2%, transparent);
  --footer-pill-border: color-mix(in srgb, var(--foreground) 12%, transparent);
  --footer-pill-highlight: color-mix(in srgb, var(--foreground) 16%, transparent);
  --footer-pill-shadow: color-mix(in srgb, var(--background) 65%, transparent);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 40s linear infinite;
}

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--foreground) 5%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 5%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 28%, black 74%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 28%, black 74%, transparent);
}

.footer-aurora {
  background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--footer-accent) 24%, transparent) 0%, color-mix(in srgb, var(--footer-accent) 14%, transparent) 42%, transparent 70%);
}

.footer-glass-pill {
  border: 1px solid var(--footer-pill-border);
  background: linear-gradient(145deg, var(--footer-pill-bg-1), var(--footer-pill-bg-2));
  box-shadow:
    0 16px 36px -18px var(--footer-pill-shadow),
    inset 0 1px 1px var(--footer-pill-highlight);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  border-color: color-mix(in srgb, var(--footer-accent) 48%, var(--foreground) 16%);
  background: linear-gradient(145deg, color-mix(in srgb, var(--foreground) 12%, transparent), color-mix(in srgb, var(--footer-accent) 10%, transparent));
  color: var(--foreground);
}

.footer-primary-cta {
  border-color: color-mix(in srgb, var(--footer-accent) 58%, white 20%);
  background: var(--footer-accent);
  color: #ffffff;
  box-shadow:
    0 18px 42px -20px var(--footer-accent),
    inset 0 1px 1px rgba(255, 255, 255, 0.22);
}

.footer-primary-cta:hover {
  border-color: var(--footer-accent);
  background: #dc2626;
  color: #ffffff;
}

.footer-giant-bg-text {
  font-family: var(--font-display);
  font-size: clamp(5rem, 20vw, 20rem);
  line-height: 0.75;
  font-weight: 800;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in srgb, var(--foreground) 8%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--foreground) 14%, transparent), transparent 68%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, var(--foreground), color-mix(in srgb, var(--foreground) 48%, transparent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 24px color-mix(in srgb, var(--footer-accent) 24%, transparent));
}
`;function h({ariaLabel:e,children:t,className:n,href:i=`#`,onClick:a,type:o=`link`}){let s=(0,f.useRef)(null);(0,f.useEffect)(()=>{let e=s.current;if(!e)return;let t=r.context(()=>{let t=t=>{let n=e.getBoundingClientRect(),i=t.clientX-n.left-n.width/2,a=t.clientY-n.top-n.height/2;r.to(e,{x:i*.22,y:a*.22,scale:1.035,ease:`power2.out`,duration:.35})},n=()=>{r.to(e,{x:0,y:0,scale:1,ease:`elastic.out(1, 0.35)`,duration:.9})};return e.addEventListener(`mousemove`,t),e.addEventListener(`mouseleave`,n),()=>{e.removeEventListener(`mousemove`,t),e.removeEventListener(`mouseleave`,n)}},e);return()=>t.revert()},[]);let c=u(`footer-glass-pill cursor-pointer`,n);return o===`button`?(0,p.jsx)(`button`,{ref:s,type:`button`,onClick:a,className:c,"aria-label":e,children:t}):(0,p.jsx)(`a`,{ref:s,href:i,className:c,"aria-label":e,children:t})}function g(){return(0,p.jsxs)(`div`,{className:`flex items-center gap-12 px-6`,children:[(0,p.jsx)(`span`,{children:`Websites that convert`}),(0,p.jsx)(`span`,{className:`text-[#ef4444]`,children:`+`}),(0,p.jsx)(`span`,{children:`Booking systems`}),(0,p.jsx)(`span`,{className:`text-[#ef4444]`,children:`+`}),(0,p.jsx)(`span`,{children:`Ecommerce experiences`}),(0,p.jsx)(`span`,{className:`text-[#ef4444]`,children:`+`}),(0,p.jsx)(`span`,{children:`SEO-ready launches`})]})}function _({type:e}){return(0,p.jsx)(`svg`,{viewBox:`0 0 24 24`,className:`h-4 w-4`,"aria-hidden":`true`,children:(0,p.jsx)(`path`,{fill:`currentColor`,d:{facebook:`M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97H15.83c-1.49 0-1.955.93-1.955 1.885v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z`,instagram:`M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.25-2.3a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1z`,linkedin:`M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.42v1.57h.05c.48-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.38 4.27 5.47v6.28zM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.04H3.53V8.98H7.1v11.47zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z`,tiktok:`M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2-2.75v-3.5a6.34 6.34 0 1 0 5.45 6.27V8.74a8.16 8.16 0 0 0 4.77 1.52V6.82c-.34 0-.67-.04-1-.13z`,twitter:`M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z`,youtube:`M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.56 12 3.56 12 3.56s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.57V8.43L15.82 12 9.6 15.57z`}[e]})})}function v(){let e=(0,f.useRef)(null),t=(0,f.useRef)(null),n=(0,f.useRef)(null),i=(0,f.useRef)(null),[u,v]=(0,f.useState)({}),y=new Date().getFullYear();(0,f.useEffect)(()=>{let e=!1;return d.publicSettings().then(t=>{e||v(t.settings)}).catch(()=>void 0),()=>{e=!0}},[]);let b=(0,f.useMemo)(()=>[{key:`instagramUrl`,label:`Instagram`,type:`instagram`},{key:`tiktokUrl`,label:`TikTok`,type:`tiktok`},{key:`facebookUrl`,label:`Facebook`,type:`facebook`},{key:`linkedinUrl`,label:`LinkedIn`,type:`linkedin`},{key:`twitterUrl`,label:`X`,type:`twitter`},{key:`youtubeUrl`,label:`YouTube`,type:`youtube`}].map(e=>({href:u[e.key]?.trim()||``,icon:(0,p.jsx)(_,{type:e.type}),label:e.label})).filter(e=>e.href),[u]);(0,f.useEffect)(()=>{if(!e.current)return;let a=r.context(()=>{r.fromTo(t.current,{y:`10vh`,scale:.88,opacity:0},{y:`0vh`,scale:1,opacity:1,ease:`power1.out`,scrollTrigger:{trigger:e.current,start:`top 82%`,end:`bottom bottom`,scrub:1}}),r.fromTo([n.current,i.current],{y:44,opacity:0},{y:0,opacity:1,stagger:.14,ease:`power3.out`,scrollTrigger:{trigger:e.current,start:`top 55%`,end:`top 12%`,scrub:1}})},e);return()=>a.revert()},[]);function x(){window.scrollTo({top:0,behavior:`smooth`})}return(0,p.jsxs)(p.Fragment,{children:[(0,p.jsx)(`style`,{dangerouslySetInnerHTML:{__html:m}}),(0,p.jsx)(`div`,{ref:e,className:`relative h-[100vh] w-full`,style:{clipPath:`polygon(0 0, 100% 0, 100% 100%, 0 100%)`},children:(0,p.jsxs)(`footer`,{className:`cinematic-footer-wrapper fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-[var(--background)] text-[var(--foreground)]`,children:[(0,p.jsx)(`div`,{className:`footer-aurora pointer-events-none absolute left-1/2 top-1/2 z-0 h-[54vh] w-[72vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[88px]`}),(0,p.jsx)(`div`,{className:`footer-bg-grid pointer-events-none absolute inset-0 z-0 opacity-60`}),(0,p.jsx)(`div`,{ref:t,className:`footer-giant-bg-text pointer-events-none absolute -bottom-[7vh] left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap opacity-55`,children:`BAKHTECH`}),(0,p.jsx)(`div`,{className:`absolute left-0 top-8 z-10 w-full -rotate-2 scale-110 overflow-hidden border-y border-[var(--line)] bg-[var(--background)]/54 py-3 shadow-xl backdrop-blur-md md:top-12`,children:(0,p.jsxs)(`div`,{className:`flex w-max animate-footer-scroll-marquee text-[0.68rem] font-extrabold uppercase tracking-[0.26em] text-[var(--muted)] md:text-xs`,children:[(0,p.jsx)(g,{}),(0,p.jsx)(g,{})]})}),(0,p.jsxs)(`div`,{className:`relative z-10 mx-auto mt-24 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 md:mt-20`,children:[(0,p.jsx)(`p`,{className:`mb-5 text-center text-[0.68rem] font-extrabold uppercase tracking-[0.28em] text-[#ef4444] md:text-xs`,children:`Bakhtech Solutions`}),(0,p.jsx)(`h2`,{ref:n,className:`footer-text-glow mb-10 max-w-3xl text-center text-4xl font-black leading-[1.02] tracking-tight md:text-7xl`,children:`Ready to build?`}),(0,p.jsxs)(`div`,{ref:i,className:`flex w-full flex-col items-center gap-6`,children:[(0,p.jsxs)(`div`,{className:`flex w-full flex-wrap justify-center gap-3`,children:[(0,p.jsxs)(h,{href:`/booking`,className:`footer-primary-cta flex items-center gap-3 rounded-full px-7 py-4 text-sm font-extrabold md:px-9 md:text-base`,children:[`Start a project`,(0,p.jsx)(a,{className:`h-4 w-4`})]}),(0,p.jsxs)(h,{href:`/portfolio`,className:`flex items-center gap-3 rounded-full px-7 py-4 text-sm font-extrabold text-[var(--foreground)] md:px-9 md:text-base`,children:[`View portfolio`,(0,p.jsx)(a,{className:`h-4 w-4`})]})]}),(0,p.jsxs)(`div`,{className:`flex w-full flex-wrap justify-center gap-2.5 md:gap-3`,children:[(0,p.jsx)(h,{href:`/about`,className:`rounded-full px-5 py-2.5 text-xs font-bold text-[var(--muted)]`,children:`About`}),(0,p.jsx)(h,{href:`/#services`,className:`rounded-full px-5 py-2.5 text-xs font-bold text-[var(--muted)]`,children:`Services`}),(0,p.jsx)(h,{href:`/contact`,className:`rounded-full px-5 py-2.5 text-xs font-bold text-[var(--muted)]`,children:`Contact`})]}),b.length?(0,p.jsx)(`div`,{className:`flex flex-wrap items-center justify-center gap-2`,children:b.map(e=>(0,p.jsx)(h,{href:e.href,className:`grid h-10 w-10 place-items-center rounded-full text-[var(--muted)] hover:text-[var(--foreground)]`,ariaLabel:e.label,children:e.icon},e.label))}):null]})]}),(0,p.jsxs)(`div`,{className:`relative z-20 grid w-full gap-4 px-6 pb-7 md:px-12`,children:[(0,p.jsxs)(`div`,{className:`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] md:text-xs`,children:[(0,p.jsxs)(`span`,{className:`inline-flex items-center gap-2`,children:[(0,p.jsx)(o,{className:`h-3.5 w-3.5 text-[#ef4444]`}),` Lekki, Lagos`]}),(0,p.jsxs)(`span`,{className:`inline-flex items-center gap-2`,children:[(0,p.jsx)(l,{className:`h-3.5 w-3.5 text-[#ef4444]`}),` solutions@bakhtech.com.ng`]}),(0,p.jsxs)(`span`,{className:`inline-flex items-center gap-2`,children:[(0,p.jsx)(c,{className:`h-3.5 w-3.5 text-[#ef4444]`}),` +234 708 637 2833`]})]}),(0,p.jsxs)(`p`,{className:`mx-auto rounded-full border border-[#ef4444]/24 bg-[#ef4444]/8 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] backdrop-blur-xl md:text-xs`,children:[`(c) `,y,` Bakhtech Solutions. All rights reserved.`]}),(0,p.jsx)(`div`,{className:`absolute bottom-7 right-6 hidden md:block md:right-12`,children:(0,p.jsx)(h,{type:`button`,onClick:x,className:`grid h-11 w-11 place-items-center rounded-full text-[var(--muted)] hover:text-[var(--foreground)]`,ariaLabel:`Back to top`,children:(0,p.jsx)(s,{className:`h-5 w-5`})})})]})]})})]})}export{v as CinematicFooter};