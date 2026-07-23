/**
 * P14 Part D3 — Generate TOPOLOGY-GALLERY.html
 *
 * Scans docs/topology-snapshots/<slug>/*.png for each flow and builds a
 * dark-themed HTML index so humans can visually inspect topology renders.
 */
const fs = require('fs');
const path = require('path');

const BASE = 'docs/topology-snapshots';
const FLOWS = [
  { flowId: 'FLOW-01', slug: 'user-registration',                   name: 'User Registration & Onboarding' },
  { flowId: 'FLOW-02', slug: 'profile-enrichment',                  name: 'Profile Enrichment & Matching' },
  { flowId: 'FLOW-03', slug: 'event-management',                    name: 'Event Creation and Promotion' },
  { flowId: 'FLOW-04', slug: 'event-attendance',                    name: 'Event Attendance & Check-In' },
  { flowId: 'FLOW-05', slug: 'completion-gamification',             name: 'Lesson Completion & Gamification' },
  { flowId: 'FLOW-06', slug: 'user-groups-communities',             name: 'User Groups & Communities' },
  { flowId: 'FLOW-07', slug: 'friend-request-social-feed',          name: 'Social Connections' },
  { flowId: 'FLOW-08', slug: 'marketplace',                         name: 'Marketplace Listings' },
  { flowId: 'FLOW-09', slug: 'transactional-event-participation',   name: 'Transactional Event Participation' },
  { flowId: 'FLOW-10', slug: 'reviews-reputation',                  name: 'Reviews & Reputation' },
  { flowId: 'FLOW-11', slug: 'schema-registry-dag',                 name: 'Schema Registry DAG' },
  { flowId: 'FLOW-12', slug: 'subscription-billing',                name: 'Subscription & Recurring Billing' },
  { flowId: 'FLOW-14', slug: 'etl-data-integration',                name: 'ETL Pipeline' },
  { flowId: 'FLOW-15', slug: 'saas-multi-tenancy',                  name: 'SaaS Multi-Tenancy' },
  { flowId: 'FLOW-16', slug: 'marketplace-payments',                name: 'Marketplace Payments' },
  { flowId: 'FLOW-17', slug: 'freelancer-marketplace',              name: 'Freelancer Marketplace' },
  { flowId: 'FLOW-18', slug: 'visual-flow-engine',                  name: 'Visual Flow Engine' },
  { flowId: 'FLOW-19', slug: 'durable-sagas-compliance',            name: 'Durable Sagas & Compliance' },
  { flowId: 'FLOW-46', slug: 'platform-agent',                      name: 'Platform Agent (Super Assistant)' },
];

function buildGallery() {
  const sectionsHtml = [];
  const navParts = [];
  let totalPngs = 0;

  for (const { flowId, slug, name } of FLOWS) {
    const dir = path.join(BASE, slug);
    if (!fs.existsSync(dir)) continue;
    const pngs = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
    if (!pngs.length) continue;
    totalPngs += pngs.length;

    navParts.push(`<a href="#${slug}">${flowId}</a>`);

    const figs = pngs
      .map((png) => {
        const label = png.replace(/\.png$/, '').replace(/-/g, ' ');
        return `    <figure style="margin:0;background:#0a0a12;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="${slug}/${png}" alt="${label}" style="width:100%;display:block">
      <figcaption style="padding:6px 10px;font-size:11px;font-family:monospace;color:#6060a0;background:#0d0d1a">${label}</figcaption>
    </figure>`;
      })
      .join('\n');

    sectionsHtml.push(`  <section id="${slug}" style="margin-bottom:40px">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1e1e36">
      <h2 style="font-size:14px;font-weight:700;color:#7c6af5;font-family:monospace">${flowId}</h2>
      <span style="font-size:13px;color:#c8c8e8">${name}</span>
      <span style="font-size:10px;color:#3a3a5a;margin-left:auto">${pngs.length} snapshot${pngs.length !== 1 ? 's' : ''}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:12px">
${figs}
    </div>
  </section>`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>XIIGen — Topology Gallery</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#070710;color:#d8d8f0;font-family:'Segoe UI',system-ui,sans-serif;padding:24px}
h1{font-family:monospace;font-size:18px;color:#7c6af5;margin-bottom:4px}
.sub{font-size:12px;color:#5a5a7a;margin-bottom:28px}
nav{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:28px}
nav a{padding:3px 10px;border-radius:4px;border:1px solid #1e1e36;background:#111120;color:#7878a0;font-size:10px;font-family:monospace;text-decoration:none}
nav a:hover{background:#1a1a2e;color:#d8d8f0}
</style>
</head>
<body>
<h1>XIIGen — Topology Gallery</h1>
<div class="sub">Generated ${date} · ${sectionsHtml.length} flows · ${totalPngs} snapshots · visual validation</div>
<nav>
${navParts.join('\n')}
</nav>
${sectionsHtml.join('\n')}
</body>
</html>`;

  const outPath = path.join(BASE, 'TOPOLOGY-GALLERY.html');
  fs.writeFileSync(outPath, html);
  console.log(`TOPOLOGY-GALLERY.html written — ${sectionsHtml.length} sections, ${totalPngs} snapshots`);
}

buildGallery();
