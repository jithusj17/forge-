import type { ProjectFile } from "./types";

// Phase 1 stand-in for real generation: pick a small, believable project for the prompt.
// Each template returns the source files shown in the Code view and a self-contained
// HTML document rendered in the sandboxed preview.

export interface MockProject {
  kind: string;
  title: string;
  summary: string;
  files: ProjectFile[];
  previewHtml: string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const baseCss = `
  *{box-sizing:border-box}html,body{margin:0;height:100%}
  body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#fafafa;color:#171717;-webkit-font-smoothing:antialiased}
  button{font:inherit;cursor:pointer}
  input,textarea{font:inherit}
`;

function doc(title: string, css: string, body: string, script = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    title,
  )}</title><style>${baseCss}${css}</style></head><body>${body}${script ? `<script>${script}</script>` : ""}</body></html>`;
}

const packageJson = (deps: Record<string, string> = {}): ProjectFile => ({
  path: "package.json",
  language: "json",
  content: JSON.stringify(
    {
      name: "my-app",
      private: true,
      scripts: { dev: "next dev", build: "next build", start: "next start" },
      dependencies: { next: "16.4.2", react: "19.3.0", "react-dom": "19.3.0", ...deps },
    },
    null,
    2,
  ),
});

function contactForm(): MockProject {
  return {
    kind: "contact-form",
    title: "Contact form",
    summary:
      "I built a contact form with name, email and message fields, inline validation, and a success state after submit. The form lives in `components/contact-form.tsx` and is rendered centered on the home page.",
    files: [
      {
        path: "components/contact-form.tsx",
        language: "tsx",
        content: `"use client"

import { useState } from "react"

export function ContactForm() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    if (!String(data.get("email")).includes("@")) {
      setError("Please enter a valid email address.")
      return
    }
    setError(null)
    setSent(true)
  }

  if (sent) {
    return <p className="text-center text-sm">Thanks! We'll be in touch soon.</p>
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input name="name" placeholder="Your name" required />
      <input name="email" type="email" placeholder="you@example.com" required />
      <textarea name="message" rows={4} placeholder="How can we help?" required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit">Send message</button>
    </form>
  )
}
`,
      },
      {
        path: "app/page.tsx",
        language: "tsx",
        content: `import { ContactForm } from "@/components/contact-form"

export default function Page() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Get in touch</h1>
      <p className="mb-6 text-neutral-500">We usually reply within a day.</p>
      <ContactForm />
    </main>
  )
}
`,
      },
      packageJson(),
    ],
    previewHtml: doc(
      "Contact",
      `main{max-width:420px;margin:0 auto;padding:64px 24px}
       h1{font-size:28px;letter-spacing:-.04em;margin:0 0 4px}
       p.sub{color:#666;margin:0 0 24px}
       form{display:flex;flex-direction:column;gap:12px}
       input,textarea{border:1px solid #e5e5e5;border-radius:8px;padding:10px 12px;background:#fff;outline:none}
       input:focus,textarea:focus{border-color:#a3a3a3}
       button{background:#171717;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-weight:500}
       .err{color:#dc2626;font-size:13px;margin:0}
       .ok{text-align:center;padding:48px 0}`,
      `<main><h1>Get in touch</h1><p class="sub">We usually reply within a day.</p>
        <form id="f"><input name="name" placeholder="Your name" required><input name="email" placeholder="you@example.com" required>
        <textarea name="message" rows="4" placeholder="How can we help?" required></textarea><p class="err" id="e" hidden></p>
        <button>Send message</button></form></main>`,
      `const f=document.getElementById('f'),e=document.getElementById('e');
       f.addEventListener('submit',ev=>{ev.preventDefault();const d=new FormData(f);
       if(!String(d.get('email')).includes('@')){e.textContent='Please enter a valid email address.';e.hidden=false;return}
       f.outerHTML='<p class="ok">Thanks! We\\'ll be in touch soon.</p>'})`,
    ),
  };
}

function todoApp(): MockProject {
  return {
    kind: "todo",
    title: "Task list",
    summary:
      "I created a task list where you can add tasks, check them off, and filter by All / Active / Done. State is kept in a small `useTasks` hook so it's easy to swap for a database later.",
    files: [
      {
        path: "hooks/use-tasks.ts",
        language: "ts",
        content: `import { useState } from "react"

export type Task = { id: string; title: string; done: boolean }

export function useTasks(initial: Task[] = []) {
  const [tasks, setTasks] = useState(initial)
  return {
    tasks,
    add: (title: string) =>
      setTasks((t) => [...t, { id: crypto.randomUUID(), title, done: false }]),
    toggle: (id: string) =>
      setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x))),
  }
}
`,
      },
      {
        path: "app/page.tsx",
        language: "tsx",
        content: `"use client"

import { useState } from "react"
import { useTasks } from "@/hooks/use-tasks"

type Filter = "all" | "active" | "done"

export default function Page() {
  const { tasks, add, toggle } = useTasks()
  const [filter, setFilter] = useState<Filter>("all")
  const visible = tasks.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done,
  )

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      {/* input, filters and list */}
    </main>
  )
}
`,
      },
      packageJson(),
    ],
    previewHtml: doc(
      "Tasks",
      `main{max-width:480px;margin:0 auto;padding:56px 24px}
       h1{font-size:28px;letter-spacing:-.04em;margin:0 0 16px}
       .row{display:flex;gap:8px}.row input{flex:1;border:1px solid #e5e5e5;border-radius:8px;padding:10px 12px;outline:none}
       li input{width:16px;height:16px;margin:0;accent-color:#171717}
       button.add{background:#171717;color:#fff;border:0;border-radius:8px;padding:0 14px}
       .filters{display:flex;gap:4px;margin:16px 0}.filters button{border:1px solid #e5e5e5;background:#fff;border-radius:999px;padding:4px 12px;font-size:13px}
       .filters button.on{background:#171717;color:#fff;border-color:#171717}
       ul{list-style:none;padding:0;margin:0;border:1px solid #eee;border-radius:10px;background:#fff}
       li{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #f0f0f0}li:last-child{border:0}
       li.done span{text-decoration:line-through;color:#a3a3a3}.empty{color:#a3a3a3;padding:20px;text-align:center}`,
      `<main><h1>Tasks</h1><form class="row" id="f"><input id="i" placeholder="Add a task…"><button class="add">Add</button></form>
       <div class="filters" id="fl"><button data-f="all" class="on">All</button><button data-f="active">Active</button><button data-f="done">Done</button></div><ul id="l"></ul></main>`,
      `let tasks=[{t:'Sketch the onboarding flow',d:true},{t:'Write API routes',d:false},{t:'Ship it',d:false}],filter='all';
       const l=document.getElementById('l');
       function render(){const v=tasks.filter(x=>filter==='all'||(filter==='done'?x.d:!x.d));
       l.innerHTML=v.length?v.map((x,i)=>'<li class="'+(x.d?'done':'')+'"><input type="checkbox" data-i="'+tasks.indexOf(x)+'" '+(x.d?'checked':'')+'><span></span></li>').join(''):'<li class="empty">Nothing here</li>';
       l.querySelectorAll('span').forEach((s,i)=>s.textContent=v[i].t)}
       l.addEventListener('change',e=>{const i=+e.target.dataset.i;tasks[i].d=!tasks[i].d;render()});
       document.getElementById('f').addEventListener('submit',e=>{e.preventDefault();const i=document.getElementById('i');if(i.value.trim()){tasks.push({t:i.value.trim(),d:false});i.value='';render()}});
       document.getElementById('fl').addEventListener('click',e=>{if(!e.target.dataset.f)return;filter=e.target.dataset.f;document.querySelectorAll('#fl button').forEach(b=>b.classList.toggle('on',b===e.target));render()});
       render()`,
    ),
  };
}

function calculator(): MockProject {
  return {
    kind: "calculator",
    title: "Loan calculator",
    summary:
      "I built a loan calculator: adjust the amount, interest rate and term to see the monthly payment and total interest update instantly. The math lives in `lib/amortize.ts`.",
    files: [
      {
        path: "lib/amortize.ts",
        language: "ts",
        content: `export function monthlyPayment(principal: number, annualRate: number, years: number) {
  const r = annualRate / 100 / 12
  const n = years * 12
  if (r === 0) return principal / n
  return (principal * r) / (1 - Math.pow(1 + r, -n))
}
`,
      },
      {
        path: "app/page.tsx",
        language: "tsx",
        content: `"use client"

import { useState } from "react"
import { monthlyPayment } from "@/lib/amortize"

export default function Page() {
  const [amount, setAmount] = useState(250_000)
  const [rate, setRate] = useState(5.5)
  const [years, setYears] = useState(30)
  const monthly = monthlyPayment(amount, rate, years)

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Loan calculator</h1>
      <p className="text-4xl font-semibold">\${monthly.toFixed(2)}/mo</p>
    </main>
  )
}
`,
      },
      packageJson(),
    ],
    previewHtml: doc(
      "Loan calculator",
      `main{max-width:440px;margin:0 auto;padding:56px 24px}h1{font-size:28px;letter-spacing:-.04em;margin:0 0 24px}
       label{display:block;font-size:13px;color:#666;margin:18px 0 6px}.v{float:right;color:#171717;font-weight:500}
       input[type=range]{width:100%;accent-color:#171717}
       .card{margin-top:28px;background:#fff;border:1px solid #eee;border-radius:12px;padding:20px}
       .big{font-size:40px;font-weight:600;letter-spacing:-.04em}.muted{color:#888;font-size:13px}`,
      `<main><h1>Loan calculator</h1>
       <label>Amount <span class="v" id="av"></span></label><input type="range" id="a" min="10000" max="1000000" step="5000" value="250000">
       <label>Interest rate <span class="v" id="rv"></span></label><input type="range" id="r" min="0" max="15" step="0.1" value="5.5">
       <label>Term <span class="v" id="yv"></span></label><input type="range" id="y" min="1" max="40" value="30">
       <div class="card"><div class="muted">Monthly payment</div><div class="big" id="m"></div><div class="muted" id="t"></div></div></main>`,
      `const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
       function u(){const P=+$('a').value,R=+$('r').value,Y=+$('y').value,r=R/1200,n=Y*12,m=r?P*r/(1-Math.pow(1+r,-n)):P/n;
       $('av').textContent=fmt(P);$('rv').textContent=R.toFixed(1)+'%';$('yv').textContent=Y+' years';$('m').textContent=fmt(m);$('t').textContent='Total interest '+fmt(m*n-P)}
       ['a','r','y'].forEach(id=>$(id).addEventListener('input',u));u()`,
    ),
  };
}

function landing(prompt: string): MockProject {
  const headline = prompt.length > 60 ? "Build something people love" : prompt.replace(/^(build|create|make|design)\s+(a|an|the)?\s*/i, "");
  const safe = escapeHtml(headline.charAt(0).toUpperCase() + headline.slice(1));
  return {
    kind: "landing",
    title: "Landing page",
    summary:
      "I designed a landing page with a sticky nav, a hero with a primary call to action, a three-column feature grid and a footer. Sections are split into components under `components/` so you can reorder them.",
    files: [
      {
        path: "components/hero.tsx",
        language: "tsx",
        content: `export function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-5xl font-semibold tracking-tight">${safe}</h1>
      <p className="mt-4 text-lg text-neutral-500">
        Everything you need to launch, in one place.
      </p>
      <a href="#" className="mt-8 inline-block rounded-full bg-black px-6 py-3 text-white">
        Get started
      </a>
    </section>
  )
}
`,
      },
      {
        path: "components/features.tsx",
        language: "tsx",
        content: `const features = [
  { title: "Fast", body: "Pages load in milliseconds." },
  { title: "Flexible", body: "Compose sections like building blocks." },
  { title: "Friendly", body: "Accessible and responsive by default." },
]

export function Features() {
  return (
    <section className="mx-auto grid max-w-5xl gap-6 px-6 md:grid-cols-3">
      {features.map((f) => (
        <div key={f.title} className="rounded-xl border p-6">
          <h3 className="font-medium">{f.title}</h3>
          <p className="text-sm text-neutral-500">{f.body}</p>
        </div>
      ))}
    </section>
  )
}
`,
      },
      {
        path: "app/page.tsx",
        language: "tsx",
        content: `import { Hero } from "@/components/hero"
import { Features } from "@/components/features"

export default function Page() {
  return (
    <main>
      <Hero />
      <Features />
    </main>
  )
}
`,
      },
      packageJson(),
    ],
    previewHtml: doc(
      "Landing",
      `nav{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:14px 28px;background:rgba(250,250,250,.8);backdrop-filter:blur(8px);border-bottom:1px solid #eee;font-size:14px}
       nav b{font-size:15px}nav a{color:#555;text-decoration:none;margin-left:18px}
       .hero{max-width:760px;margin:0 auto;padding:96px 24px 72px;text-align:center}
       .hero h1{font-size:clamp(36px,6vw,56px);line-height:1.05;letter-spacing:-.05em;margin:0}
       .hero p{color:#737373;font-size:18px;margin:16px 0 32px}
       .cta{display:inline-block;background:#171717;color:#fff;border-radius:999px;padding:12px 22px;text-decoration:none;font-weight:500}
       .grid{max-width:980px;margin:0 auto;padding:0 24px 96px;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
       .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:22px}.card h3{margin:0 0 6px;font-size:15px}.card p{margin:0;color:#737373;font-size:14px}
       footer{border-top:1px solid #eee;padding:24px;text-align:center;color:#a3a3a3;font-size:13px}`,
      `<nav><b>Acme</b><div><a href="#">Features</a><a href="#">Pricing</a><a href="#">Docs</a></div></nav>
       <section class="hero"><h1>${safe}</h1><p>Everything you need to launch, in one place.</p><a class="cta" href="#">Get started</a></section>
       <section class="grid"><div class="card"><h3>Fast</h3><p>Pages load in milliseconds.</p></div><div class="card"><h3>Flexible</h3><p>Compose sections like building blocks.</p></div><div class="card"><h3>Friendly</h3><p>Accessible and responsive by default.</p></div></section>
       <footer>© 2026 Acme, Inc.</footer>`,
    ),
  };
}

const BUILDERS: Record<string, (prompt: string) => MockProject> = {
  "contact-form": contactForm,
  todo: todoApp,
  calculator,
  landing,
};

function matchKind(prompt: string): string | null {
  const p = prompt.toLowerCase();
  if (/contact|form|sign ?up|feedback/.test(p)) return "contact-form";
  if (/todo|task|checklist|kanban/.test(p)) return "todo";
  if (/calc|loan|mortgage|finance|budget/.test(p)) return "calculator";
  if (/landing|homepage|marketing|website/.test(p)) return "landing";
  return null;
}

/** Follow-up prompts keep iterating on the current project unless they clearly ask for another kind. */
export function pickMockProject(prompt: string, currentKind?: string, originalPrompt = prompt): MockProject {
  const kind = matchKind(prompt) ?? currentKind ?? "landing";
  return BUILDERS[kind](kind === currentKind ? originalPrompt : prompt);
}
