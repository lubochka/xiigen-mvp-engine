#!/usr/bin/env node
/**
 * gen-session-viz.js v2
 * Renders session documents as directed node graphs (Mermaid → PNG).
 * Aesthetic: n8n / draw.io — rounded nodes connected by labeled arrows.
 *
 * Usage:
 *   node scripts/gen-session-viz.js              # all 47 flows
 *   node scripts/gen-session-viz.js FLOW-09      # single flow (test first)
 *
 * Output:  docs/sessions/FLOW-XX/viz/*.png  +  FLOW-XX-GALLERY.html
 *          docs/sessions/GALLERY-INDEX.html
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '..', 'docs', 'sessions');
const VIEWPORT = { width: 1400, height: 900 };

// ── File type router ──────────────────────────────────────────────────────────

function classifyFile(filename) {
  const DS = filename.match(/DESIGN-SIMULATION-R(\d+)\.md$/);
  if (DS) return { type: 'DESIGN_SIM', label: `Design Simulation R${DS[1]}`,
                   slug: `design-simulation-r${DS[1]}` };
  if (/TEACH-QA/.test(filename)) {
    const sfx = (filename.match(/TEACH-QA-?(.*)\.md$/) || ['','R0'])[1] || 'R0';
    return { type: 'TEACH_QA', label: `Teach QA ${sfx}`, slug: `teach-qa-${sfx.toLowerCase()}` };
  }
  if (/SESSION-TEACH-(.+)\.md$/.test(filename)) {
    const id = filename.match(/SESSION-TEACH-(.+)\.md$/)[1];
    return { type: 'SESSION_TEACH', label: `Teach: ${id}`, slug: `teach-${id.toLowerCase()}` };
  }
  if (/RECONCILIATION-STATE\.md$/.test(filename))
    return { type: 'RECONCILIATION', label: 'Reconciliation State', slug: 'reconciliation-state' };
  if (/QA-COVERAGE-STATE\.md$/.test(filename))
    return { type: 'QA_COVERAGE', label: 'QA Coverage State', slug: 'qa-coverage-state' };
  return null;
}

// ── Mermaid syntax builders ───────────────────────────────────────────────────

function safeid(s) {
  return s.replace(/[^a-zA-Z0-9]/g, '_');
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// Sanitize a string for use inside a Mermaid node label ["..."]/(["..."])
// Strips/replaces chars that break the Mermaid parser.
function mlabel(s, n) {
  const t = (s == null ? '' : String(s))
    .replace(/`/g, "'")            // backticks → apostrophes
    .replace(/"/g, "'")            // double quotes → apostrophes
    .replace(/[\[\]{}()]/g, ' ')   // brackets → space
    .replace(/[<>|]/g, ' ')        // angle brackets + pipe
    .replace(/\s+/g, ' ')
    .trim();
  return n ? truncate(t, n) : t;
}

function buildDesignSimMermaid(content, flowId) {
  const taskRe = /^## T(\d+) — (.+)/gm;
  const tasks = [];
  let m;
  while ((m = taskRe.exec(content)) !== null) {
    tasks.push({ id: `T${m[1]}`, num: parseInt(m[1]), name: mlabel(m[2], 28) });
  }
  if (tasks.length === 0) return null;

  const archetypes = {};
  tasks.forEach(t => {
    const taskSection = content.slice(
      content.indexOf(`## ${t.id} —`),
      content.indexOf(`## T`, content.indexOf(`## ${t.id} —`) + 10) || content.length
    ).slice(0, 600);
    if (/ORCHESTRATION/i.test(taskSection)) archetypes[t.id] = 'orch';
    else if (/TRANSACTION/i.test(taskSection)) archetypes[t.id] = 'txn';
    else if (/VALIDATION|GATE/i.test(taskSection)) archetypes[t.id] = 'val';
    else if (/DATA_PIPELINE|ANALYTICS|REPORTER|AGGREGATOR/i.test(taskSection)) archetypes[t.id] = 'data';
    else if (/SCHEDULED|JOB/i.test(taskSection)) archetypes[t.id] = 'sched';
    else archetypes[t.id] = 'def';
  });

  const edgeSet = new Set();
  const chainRe = /T(\d+)[→>]T(\d+)/g;
  let em;
  while ((em = chainRe.exec(content)) !== null) {
    const from = `T${em[1]}`, to = `T${em[2]}`;
    if (tasks.find(t => t.id === from) && tasks.find(t => t.id === to)) {
      edgeSet.add(`${from}-->${to}`);
    }
  }
  const priorRe = /## (T\d+) —[^\n]+\n[\s\S]{0,500}?PRIOR NODES: \[([^\]]+)\]/g;
  while ((em = priorRe.exec(content)) !== null) {
    const toTask = em[1];
    em[2].split(',').map(s => s.trim().replace(/^RAG:.*/, '')).forEach(fromRaw => {
      const fm = fromRaw.match(/T\d+/);
      if (fm) edgeSet.add(`${fm[0]}-->${toTask}`);
    });
  }
  // Always connect orphan tasks sequentially so graph is readable
  const limit = Math.min(tasks.length, 14);
  const shown = tasks.slice(0, limit);
  const connected = new Set();
  [...edgeSet].forEach(e => {
    const [f, t] = e.split('-->');
    connected.add(f); connected.add(t);
  });
  shown.forEach((t, i) => {
    if (!connected.has(t.id) && i > 0) {
      edgeSet.add(`${shown[i - 1].id}-->${t.id}`);
    }
  });
  const nodeLines = shown.map(t => {
    const cls = archetypes[t.id] || 'def';
    return `  ${t.id}(["${t.id}\\n${t.name}"]):::${cls}`;
  });
  const edgeLines = [...edgeSet]
    .filter(e => {
      const [f, t2] = e.split('-->');
      return shown.find(t => t.id === f) && shown.find(t => t.id === t2);
    })
    .slice(0, 30)
    .map(e => `  ${e}`);

  return `graph LR\n${nodeLines.join('\n')}\n${edgeLines.join('\n')}\n` +
    `  classDef orch fill:#3a1f6e,stroke:#9b8fff,color:#e8e8ff\n` +
    `  classDef txn fill:#1a3a2a,stroke:#4dd9a8,color:#e8e8ff\n` +
    `  classDef val fill:#1a2a3a,stroke:#60b8f0,color:#e8e8ff\n` +
    `  classDef data fill:#2a1a3a,stroke:#d080e8,color:#e8e8ff\n` +
    `  classDef sched fill:#3a2a1a,stroke:#f0a060,color:#e8e8ff\n` +
    `  classDef def fill:#141430,stroke:#3a3a5a,color:#c8c8e8`;
}

function buildTeachQAMermaid(content, flowId) {
  const gapRe = /### (GAP-\d+-\d+)\s*(🔴|🟠|🟡|🟢|🔵)?\s*([^\n]+)/g;
  const gaps = [];
  let m;
  while ((m = gapRe.exec(content)) !== null) {
    const sev = m[2] || (m[3].includes('🔴') ? '🔴' : m[3].includes('🟠') ? '🟠' :
                          m[3].includes('🟡') ? '🟡' : '🔵');
    gaps.push({ id: m[1], sev, title: mlabel(m[3].replace(/🔴|🟠|🟡|🔵|🟢/g,''), 35) });
  }
  if (gaps.length === 0) {
    const tableRe = /\|\s*(GAP-\d+-\d+)\s*\|\s*(🔴|🟠|🟡|🔵)?\s*\|\s*([^|]+)/g;
    while ((m = tableRe.exec(content)) !== null) {
      gaps.push({ id: m[1], sev: m[2] || '🔵',
                  title: mlabel(m[3], 35) });
    }
  }

  const byKey = { '🔴': 'B', '🟠': 'H', '🟡': 'M', '🔵': 'L', '🟢': 'L' };
  const clusters = {};
  gaps.forEach(g => {
    const k = byKey[g.sev] || 'L';
    if (!clusters[k]) clusters[k] = [];
    clusters[k].push(g);
  });

  const flowTitle = `${flowId}\\n${gaps.length} gap${gaps.length !== 1 ? 's' : ''}`;
  let lines = [`graph TD`, `  ROOT(["${flowTitle}"]):::root`];

  const sevLabel = { B: '🔴 BLOCKERS', H: '🟠 HIGH', M: '🟡 MEDIUM', L: '🔵 LOW' };
  const sevCls = { B: 'blocker', H: 'high', M: 'medium', L: 'low' };

  Object.entries(clusters).forEach(([k, gs]) => {
    const clusterNode = `SEV_${k}`;
    lines.push(`  ${clusterNode}(["${sevLabel[k]}\\n${gs.length}"]):::${sevCls[k]}`);
    lines.push(`  ROOT --> ${clusterNode}`);
    const maxLeaves = 3;
    gs.slice(0, maxLeaves).forEach((g, i) => {
      const gn = safeid(`${g.id}_${i}`);
      lines.push(`  ${gn}["${g.id}\\n${g.title}"]:::${sevCls[k]}`);
      lines.push(`  ${clusterNode} --> ${gn}`);
    });
    if (gs.length > maxLeaves) {
      const more = `MORE_${k}`;
      lines.push(`  ${more}["+${gs.length - maxLeaves} more"]:::${sevCls[k]}`);
      lines.push(`  ${clusterNode} --> ${more}`);
    }
  });

  lines.push(
    `  classDef root fill:#1a1a3a,stroke:#9b8fff,color:#e8e8ff`,
    `  classDef blocker fill:#3a0a0a,stroke:#ff4444,color:#ffaaaa`,
    `  classDef high fill:#3a1a0a,stroke:#ff8c42,color:#ffccaa`,
    `  classDef medium fill:#2a2a0a,stroke:#ffd54f,color:#ffeeaa`,
    `  classDef low fill:#0a2a1a,stroke:#4dd9a8,color:#aaffdd`
  );

  if (gaps.length === 0) {
    return `graph TD\n  ROOT(["${flowId}\\nNo gaps — All Clear ✅"]):::root\n  classDef root fill:#0a2a1a,stroke:#4dd9a8,color:#aaffdd`;
  }
  return lines.join('\n');
}

function buildSessionTeachMermaid(content, flowId, sourceFilename) {
  const typeMatch = content.match(/# TYPE: (.+)/);
  const teachType = typeMatch ? mlabel(typeMatch[1], 20) : 'TEACH';

  // Task id preference: T-number in filename → any SESSION-TEACH-<id> in filename/content → DPO label
  let taskId = 'TEACH';
  const tnumFile = (sourceFilename || '').match(/SESSION-TEACH-(T\d+[^.\s]*)/);
  if (tnumFile) taskId = tnumFile[1];
  else {
    const anyFile = (sourceFilename || '').match(/SESSION-TEACH-([^.]+)\.md$/);
    if (anyFile) taskId = mlabel(anyFile[1].toUpperCase(), 24);
    else {
      const tnumContent = content.match(/SESSION-TEACH-(T\d+[^.\s]*)/);
      if (tnumContent) taskId = tnumContent[1];
    }
  }
  // Avoid `"TEACH\\nTEACH"` when teachType also fell back to 'TEACH'
  const entryLine2 = teachType === 'TEACH' && taskId !== 'TEACH' ? '' : teachType;

  const steps = (content.match(/## STEP ([^\n]+)/g) || [])
    .slice(0, 7)
    .map((s, i) => ({ n: i + 1, label: mlabel(s.replace('## STEP ', ''), 30) }));

  const whatMatch = content.match(/# WHAT THIS SESSION DOES:\n#\s*([^\n]+)/);
  const output = whatMatch ? mlabel(whatMatch[1], 35) : 'DPO triple written';

  let lines = [`graph LR`];
  const entryLabel = entryLine2 ? `${taskId}\\n${entryLine2}` : taskId;
  lines.push(`  ENTRY(["${entryLabel}"]):::entry`);
  if (steps.length === 0) {
    lines.push(`  OUT(["✅ ${output}"]):::out`);
    lines.push(`  ENTRY --> OUT`);
  } else {
    steps.forEach((s, i) => {
      lines.push(`  S${i + 1}["Step ${s.n}\\n${s.label}"]:::step`);
    });
    lines.push(`  OUT(["✅ ${output}"]):::out`);
    lines.push(`  ENTRY --> S1`);
    steps.slice(0, -1).forEach((_, i) => lines.push(`  S${i + 1} --> S${i + 2}`));
    lines.push(`  S${steps.length} --> OUT`);
  }
  lines.push(
    `  classDef entry fill:#1a1a3a,stroke:#9b8fff,color:#e8e8ff`,
    `  classDef step fill:#141430,stroke:#3a3a5a,color:#c8c8e8`,
    `  classDef out fill:#0a2a1a,stroke:#4dd9a8,color:#aaffdd`
  );
  return lines.join('\n');
}

function buildReconciliationMermaid(content, flowId) {
  // Verdict line: "RECONCILED", "DEMONSTRABLY_WRONG", "PARTIAL", "BLOCKING"
  const verdictM = content.match(/\*\*([A-Z_]+(?:\s*[—-][^*\n]+)?)\*\*/);
  const verdictRaw = verdictM ? verdictM[1].trim() : 'Reconciliation';
  const verdictKey = verdictRaw.split(/[—-]/)[0].trim();
  const verdictCls =
    /RECONCIL/i.test(verdictKey) && !/WRONG|FAIL/i.test(verdictKey) ? 'ok' :
    /PARTIAL/i.test(verdictKey) ? 'warn' :
    /WRONG|FAIL|BLOCK/i.test(verdictKey) ? 'fail' : 'warn';
  const verdictLabel = mlabel(verdictKey, 30);

  // Discrepancies: "### D-N: summary"
  const discRe = /### D-(\d+):\s*([^\n]+)/g;
  const discs = [];
  let m;
  while ((m = discRe.exec(content)) !== null) {
    discs.push({ n: m[1], title: mlabel(m[2], 45) });
  }
  // Severity per discrepancy — scan next 300 chars for "Severity: XXX"
  discs.forEach(d => {
    const idx = content.indexOf(`### D-${d.n}:`);
    const slice = content.slice(idx, idx + 600);
    const sev = slice.match(/Severity:\*?\*?\s*([A-Z_]+)/i);
    const s = sev ? sev[1].toUpperCase() : 'MINOR';
    d.cls = /BLOCK/i.test(s) ? 'fail' :
            /SIGNIF|HIGH/i.test(s) ? 'warn' :
            /MINOR|LOW/i.test(s) ? 'ok' : 'warn';
  });

  // Test count hint
  const testM = content.match(/(\d{2,5})\s*(it[- ]?blocks?|passing|pass\b)/i);
  const testCount = testM ? testM[1] : null;

  let lines = [`graph TD`];
  lines.push(`  ROOT(["${flowId}\\n${verdictLabel}${testCount ? '\\n' + testCount + ' tests' : ''}"]):::${verdictCls}`);

  if (discs.length === 0) {
    lines.push(`  NOD(["No discrepancies"]):::ok`);
    lines.push(`  ROOT --> NOD`);
  } else {
    // Group discs by cls
    const groups = { fail: [], warn: [], ok: [] };
    discs.forEach(d => groups[d.cls].push(d));
    const groupLabels = { fail: '🔴 BLOCKING', warn: '🟠 SIGNIFICANT', ok: '🟡 MINOR' };
    Object.entries(groups).forEach(([k, arr]) => {
      if (!arr.length) return;
      const gid = `G_${k}`;
      lines.push(`  ${gid}(["${groupLabels[k]}\\n${arr.length}"]):::${k}`);
      lines.push(`  ROOT --> ${gid}`);
      arr.slice(0, 6).forEach(d => {
        const dn = `D${d.n}`;
        lines.push(`  ${dn}["D-${d.n}\\n${d.title}"]:::${k}`);
        lines.push(`  ${gid} --> ${dn}`);
      });
    });
  }

  lines.push(
    `  classDef ok fill:#0a2a1a,stroke:#4dd9a8,color:#aaffdd`,
    `  classDef fail fill:#3a0a0a,stroke:#ff4444,color:#ffaaaa`,
    `  classDef warn fill:#2a2a0a,stroke:#ffd54f,color:#ffeeaa`
  );
  return lines.join('\n');
}

function buildQACoverageMermaid(content, flowId) {
  // Q-category table rows: | Q1 ... | scope | status | verdict |
  const qRe = /^\|\s*(Q\d+)\s+([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm;
  const cats = [];
  let m;
  while ((m = qRe.exec(content)) !== null) {
    const label = m[2].trim();
    const verdict = m[5].trim().toUpperCase();
    const cls = /^BOUND|PASS|COMPLETE|✅/i.test(verdict) ? 'pass' :
                /FAIL|BLOCKED|❌/i.test(verdict) ? 'fail' :
                /N\/?A|NOT_APPLICABLE/i.test(verdict) ? 'na' :
                /PARTIAL|TBD/i.test(verdict) ? 'partial' : 'partial';
    cats.push({ id: m[1], label: truncate(label, 30),
                verdict: truncate(verdict, 15), cls });
  }

  // Fallback — try "Phase A-F" format
  if (cats.length === 0) {
    const phaseRe = /Phase ([A-F])[:\s]+([^\n]{0,60})/g;
    const phases = [];
    while ((m = phaseRe.exec(content)) !== null) {
      const label = m[2].trim();
      const pass = /pass|✅|complete/i.test(label) ? 'pass' :
                   /fail|❌|missing/i.test(label) ? 'fail' : 'partial';
      phases.push({ id: `P${m[1]}`, label: `Phase ${m[1]}`,
                    verdict: truncate(label, 15), cls: pass });
    }
    if (phases.length === 0) {
      const testM = content.match(/(\d+)\s*(pass|it[- ]?block|tests?)/i);
      return `graph LR\n  QA(["${flowId} QA Coverage\\n${testM ? testM[1] + ' ' + testM[2] : 'See doc'}"]):::partial\n  classDef partial fill:#1a2a3a,stroke:#60b8f0,color:#e8e8ff`;
    }
    cats.push(...phases);
  }

  let lines = [`graph LR`];
  lines.push(`  FLOW(["${flowId}\\nQA Coverage"]):::root`);
  cats.forEach(c => {
    lines.push(`  ${c.id}(["${c.id}\\n${c.label}\\n${c.verdict}"]):::${c.cls}`);
    lines.push(`  FLOW --> ${c.id}`);
  });
  lines.push(
    `  classDef root fill:#1a1a3a,stroke:#9b8fff,color:#e8e8ff`,
    `  classDef pass fill:#0a2a1a,stroke:#4dd9a8,color:#aaffdd`,
    `  classDef fail fill:#3a0a0a,stroke:#ff4444,color:#ffaaaa`,
    `  classDef partial fill:#1a2a3a,stroke:#60b8f0,color:#e8e8ff`,
    `  classDef na fill:#1a1a2a,stroke:#3a3a5a,color:#8080a0`
  );
  return lines.join('\n');
}

// ── Mermaid → HTML wrapper (dark theme, Mermaid CDN) ──────────────────────────
// NOTE: Mermaid syntax is placed directly as DOM text content — Mermaid parses
// innerText on initialize. No JS-string escaping (backticks/dollars) needed;
// we just need to protect HTML special chars so the parser sees the raw syntax.

function mermaidHtml(mermaidSyntax, flowId, docLabel) {
  const htmlSafe = mermaidSyntax
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #07071a; font-family: 'Segoe UI', system-ui, sans-serif;
         padding: 24px 28px; }
  .header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; }
  .flow-badge { background: rgba(124,106,245,.15); border: 1px solid rgba(124,106,245,.3);
                color: #9b8fff; font-family: monospace; font-size: 12px; font-weight: 700;
                padding: 3px 10px; border-radius: 4px; }
  .doc-label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
               color: #5a5a7a; font-family: monospace; }
  .graph-wrap { background: #0d0d22; border: 1px solid #1e1e3c; border-radius: 10px;
                padding: 28px; display: flex; align-items: center;
                justify-content: center; overflow: hidden; }
  .graph-wrap svg { width: 100% !important; height: auto !important;
                     max-width: 100% !important; max-height: 780px; }
  .graph-wrap svg .node rect, .graph-wrap svg .node ellipse,
  .graph-wrap svg .node polygon, .graph-wrap svg .node path {
    stroke-width: 2px !important; }
  .graph-wrap svg .nodeLabel, .graph-wrap svg .edgeLabel {
    font-size: 16px !important; font-weight: 500 !important; }
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head><body>
<div class="header">
  <span class="flow-badge">${flowId}</span>
  <span class="doc-label">${docLabel}</span>
</div>
<div class="graph-wrap">
  <pre class="mermaid">${htmlSafe}</pre>
</div>
<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    themeVariables: {
      background: '#0d0d22',
      primaryColor: '#1a1a3a',
      primaryTextColor: '#e8e8ff',
      primaryBorderColor: '#3a3a5a',
      lineColor: '#5a5a7a',
      secondaryColor: '#141430',
      tertiaryColor: '#0a0a1a',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px',
    },
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
  });
</script>
</body></html>`;
}

// ── Render one document ───────────────────────────────────────────────────────

async function renderDocument(browser, filePath, outputDir, flowId) {
  const filename = path.basename(filePath);
  const cls = classifyFile(filename);
  if (!cls) return null;

  const content = fs.readFileSync(filePath, 'utf8');
  let mermaid;
  switch (cls.type) {
    case 'DESIGN_SIM':    mermaid = buildDesignSimMermaid(content, flowId); break;
    case 'TEACH_QA':      mermaid = buildTeachQAMermaid(content, flowId); break;
    case 'SESSION_TEACH': mermaid = buildSessionTeachMermaid(content, flowId, filename); break;
    case 'RECONCILIATION':mermaid = buildReconciliationMermaid(content, flowId); break;
    case 'QA_COVERAGE':   mermaid = buildQACoverageMermaid(content, flowId); break;
    default: return null;
  }
  if (!mermaid) return null;

  const html = mermaidHtml(mermaid, flowId, cls.label);
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  const tmpHtml = path.join(outputDir, `_tmp_${cls.slug}.html`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(tmpHtml, html);
  await page.goto(`file://${tmpHtml}`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('.mermaid svg', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 700));

  // Scale SVG up to fill the container width (Mermaid leaves viewBox + small explicit size)
  await page.evaluate(() => {
    const svg = document.querySelector('.mermaid svg');
    if (!svg) return;
    const bb = svg.getBBox();
    const wrap = document.querySelector('.graph-wrap');
    const maxW = (wrap ? wrap.clientWidth : 1300) - 40;
    const maxH = 820;
    const scale = Math.min(maxW / Math.max(bb.width, 1), maxH / Math.max(bb.height, 1), 6);
    const newW = Math.round(bb.width * scale);
    const newH = Math.round(bb.height * scale);
    svg.setAttribute('width', newW);
    svg.setAttribute('height', newH);
    svg.style.width = newW + 'px';
    svg.style.height = newH + 'px';
    svg.style.display = 'block';
  });
  await new Promise(r => setTimeout(r, 200));

  // Measure content to crop PNG to (header + graph-wrap) only — no dead canvas below
  const contentHeight = await page.evaluate(() => {
    const wrap = document.querySelector('.graph-wrap');
    if (!wrap) return 900;
    const r = wrap.getBoundingClientRect();
    return Math.ceil(r.bottom + 28);
  });
  const pngPath = path.join(outputDir, `${cls.slug}.png`);
  await page.screenshot({
    path: pngPath,
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: contentHeight },
  });
  await page.close();
  try { fs.unlinkSync(tmpHtml); } catch {}

  console.log(`  ✓ ${flowId}/viz/${cls.slug}.png`);
  return { slug: cls.slug, label: cls.label, pngPath, relPath: `viz/${cls.slug}.png` };
}

// ── Gallery builders ──────────────────────────────────────────────────────────

function buildFlowGallery(flowId, pngs) {
  const figs = pngs.map(p => `
    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="${p.relPath}" alt="${p.label}" style="width:100%;display:block">
      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">${p.label}</figcaption>
    </figure>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{background:#070710;color:#d8d8f0;font-family:monospace;padding:24px}
    h1{font-size:15px;color:#9b8fff;margin-bottom:4px} .sub{font-size:10px;color:#5a5a7a;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(540px,1fr));gap:14px}</style>
  </head><body>
  <h1>${flowId}</h1>
  <div class="sub">${pngs.length} session document${pngs.length!==1?'s':''}</div>
  <div class="grid">${figs}</div>
  </body></html>`;
}

function buildMasterIndex(results) {
  const rows = results.map(r => `
    <a href="${r.galleryPath}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;background:#0d0d1c;border:1px solid #1e1e36;text-decoration:none">
      <span style="font-family:monospace;font-size:12px;font-weight:700;color:#9b8fff;width:80px;flex-shrink:0">${r.flowId}</span>
      <span style="font-size:11px;color:#5a5a7a">${r.pngCount} docs</span>
    </a>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{background:#070710;color:#d8d8f0;font-family:monospace;padding:24px}
    h1{font-size:18px;color:#9b8fff;margin-bottom:4px} .sub{font-size:11px;color:#5a5a7a;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px}</style>
  </head><body>
  <h1>XIIGen — Session Document Gallery</h1>
  <div class="sub">47 flows · design simulations, teach-qa, teaching, reconciliation, QA coverage</div>
  <div class="grid">${rows}</div>
  </body></html>`;
}

// ── Main runner ───────────────────────────────────────────────────────────────

async function run() {
  const targetFlow = process.argv[2];
  const browser = await puppeteer.launch({ headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const results = [];

  const flowDirs = fs.readdirSync(SESSIONS_DIR)
    .filter(d => /^FLOW-\d+$/.test(d)).sort()
    .filter(d => !targetFlow || d === targetFlow);

  for (const flowDir of flowDirs) {
    const flowPath = path.join(SESSIONS_DIR, flowDir);
    const vizDir = path.join(flowPath, 'viz');
    const pngs = [];
    const sourceFiles = [];

    fs.readdirSync(flowPath).filter(f => f.endsWith('.md') && classifyFile(f))
      .forEach(f => sourceFiles.push(path.join(flowPath, f)));

    function findTeach(dir) {
      try { fs.readdirSync(dir, { withFileTypes: true }).forEach(ent => {
        if (ent.isDirectory()) findTeach(path.join(dir, ent.name));
        else if (ent.name.startsWith('SESSION-TEACH-') && ent.name.endsWith('.md'))
          sourceFiles.push(path.join(dir, ent.name));
      }); } catch {}
    }
    findTeach(flowPath);

    if (sourceFiles.length === 0) { console.log(`  skip ${flowDir}`); continue; }
    console.log(`\n${flowDir} — ${sourceFiles.length} files`);

    for (const fp of sourceFiles) {
      const r = await renderDocument(browser, fp, vizDir, flowDir);
      if (r) pngs.push(r);
    }

    if (pngs.length > 0) {
      fs.writeFileSync(
        path.join(flowPath, `${flowDir}-GALLERY.html`),
        buildFlowGallery(flowDir, pngs)
      );
      results.push({ flowId: flowDir, pngCount: pngs.length,
                     galleryPath: `${flowDir}/${flowDir}-GALLERY.html` });
      console.log(`  → ${flowDir}-GALLERY.html (${pngs.length} PNGs)`);
    }
  }

  if (!targetFlow) {
    fs.writeFileSync(path.join(SESSIONS_DIR, 'GALLERY-INDEX.html'), buildMasterIndex(results));
    console.log(`\n✅ GALLERY-INDEX.html — ${results.length} flows`);
  }
  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
