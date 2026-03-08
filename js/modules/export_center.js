/* FILE: /js/modules/export_center.js */
// Bright Cub Creator — Export Center v0.1 SAFE
// Objetivo:
// - centro visual de exportação do pipeline editorial
// - usa preflight + export manifest
// - sem PDF ainda
// - sem ZIP ainda
// - compatível com Safari/iOS
// - sem dependências externas

import { Storage } from '../core/storage.js';
import { evaluateColoringPreflight } from '../core/preflight_gate.js';
import { buildColoringExportManifest } from '../core/export_manifest.js';

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    })[c];
  });
}

function normalizeText(value){
  return String(value == null ? '' : value).trim();
}

function toInt(value, fallback){
  var n = parseInt(value, 10);
  if (!isFinite(n)) return fallback;
  return n;
}

function clone(value){
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return value;
  }
}

function normalizePlan(input){
  var src = input && typeof input === 'object' ? clone(input) : {};
  return {
    id: normalizeText(src.id),
    theme: normalizeText(src.theme),
    ageGroup: normalizeText(src.ageGroup),
    pageTarget: Math.max(0, toInt(src.pageTarget, 0)),
    language: normalizeText(src.language || 'en') || 'en',
    style: normalizeText(src.style || 'clean coloring page') || 'clean coloring page',
    status: normalizeText(src.status || 'idle') || 'idle',
    scenes: Array.isArray(src.scenes) ? src.scenes.slice() : [],
    createdAt: normalizeText(src.createdAt),
    updatedAt: normalizeText(src.updatedAt)
  };
}

function safeEvaluatePreflight(plan){
  try {
    return evaluateColoringPreflight(plan || {});
  } catch (e) {
    return {
      canProceed: false,
      issues: ['preflight evaluation failed: ' + String((e && e.message) || e || 'unknown error')],
      warnings: [],
      stats: {
        totalScenes: 0,
        approvedForBook: 0,
        rejected: 0,
        needsRedo: 0,
        pendingReview: 0,
        pageTarget: 0
      },
      summary: 'Preflight failed.'
    };
  }
}

function safeBuildManifest(plan, preflight){
  try {
    return buildColoringExportManifest(plan || {}, preflight || {});
  } catch (e) {
    return null;
  }
}

function downloadJson(filename, obj){
  var blob = new Blob([JSON.stringify(obj, null, 2)], { type:'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(function(){
    URL.revokeObjectURL(a.href);
  }, 4000);
}

function renderBookSummary(plan){
  return `
    <div class="ec-grid">
      <div class="ec-item"><span class="k">Theme</span><span class="v">${esc(plan.theme || '-')}</span></div>
      <div class="ec-item"><span class="k">Age Group</span><span class="v">${esc(plan.ageGroup || '-')}</span></div>
      <div class="ec-item"><span class="k">Page Target</span><span class="v">${esc(String(plan.pageTarget || 0))}</span></div>
      <div class="ec-item"><span class="k">Status</span><span class="v">${esc(plan.status || '-')}</span></div>
      <div class="ec-item"><span class="k">Language</span><span class="v">${esc(plan.language || '-')}</span></div>
      <div class="ec-item"><span class="k">Style</span><span class="v">${esc(plan.style || '-')}</span></div>
    </div>
  `;
}

function renderPreflight(preflight){
  var issues = Array.isArray(preflight && preflight.issues) ? preflight.issues : [];
  var warnings = Array.isArray(preflight && preflight.warnings) ? preflight.warnings : [];
  var stats = preflight && preflight.stats ? preflight.stats : {};

  return `
    <div class="ec-preflight ${preflight && preflight.canProceed ? 'is-pass' : 'is-block'}">
      <div class="ec-head">
        <div class="ec-title">Preflight</div>
        <div class="ec-badge ${preflight && preflight.canProceed ? 'is-pass' : 'is-block'}">
          ${preflight && preflight.canProceed ? 'READY' : 'BLOCKED'}
        </div>
      </div>

      <div class="ec-summary">${esc((preflight && preflight.summary) || '-')}</div>

      <div class="ec-grid">
        <div class="ec-item"><span class="k">canProceed</span><span class="v">${esc(String(!!(preflight && preflight.canProceed)))}</span></div>
        <div class="ec-item"><span class="k">totalScenes</span><span class="v">${esc(String(stats.totalScenes || 0))}</span></div>
        <div class="ec-item"><span class="k">approvedForBook</span><span class="v">${esc(String(stats.approvedForBook || 0))}</span></div>
        <div class="ec-item"><span class="k">rejected</span><span class="v">${esc(String(stats.rejected || 0))}</span></div>
        <div class="ec-item"><span class="k">needsRedo</span><span class="v">${esc(String(stats.needsRedo || 0))}</span></div>
        <div class="ec-item"><span class="k">pendingReview</span><span class="v">${esc(String(stats.pendingReview || 0))}</span></div>
      </div>

      <div class="ec-lists">
        <div>
          <div class="ec-subtitle">Issues</div>
          ${
            issues.length
              ? '<ul class="ec-list">' + issues.map(function(item){ return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>'
              : '<p class="muted">No issues.</p>'
          }
        </div>

        <div>
          <div class="ec-subtitle">Warnings</div>
          ${
            warnings.length
              ? '<ul class="ec-list">' + warnings.map(function(item){ return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>'
              : '<p class="muted">No warnings.</p>'
          }
        </div>
      </div>
    </div>
  `;
}

function renderManifestSummary(manifest){
  if (!manifest) {
    return `
      <div class="ec-grid">
        <div class="ec-item"><span class="k">Export Type</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Manifest Version</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Scenes Count</span><span class="v">0</span></div>
        <div class="ec-item"><span class="k">Generated At</span><span class="v">-</span></div>
      </div>
    `;
  }

  var scenesCount = Array.isArray(manifest.scenes) ? manifest.scenes.length : 0;

  return `
    <div class="ec-grid">
      <div class="ec-item"><span class="k">Export Type</span><span class="v">${esc(manifest.exportType || '-')}</span></div>
      <div class="ec-item"><span class="k">Manifest Version</span><span class="v">${esc(manifest.manifestVersion || '-')}</span></div>
      <div class="ec-item"><span class="k">Scenes Count</span><span class="v">${esc(String(scenesCount))}</span></div>
      <div class="ec-item"><span class="k">Generated At</span><span class="v">${esc(manifest.generatedAt || '-')}</span></div>
    </div>
  `;
}

export class ExportCenterModule {
  constructor(app){
    this.app = app;
    this.id = 'export_center';
    this.title = 'Export Center';
  }

  async init(){}

  render(root){
    var currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
    var hasPlan = !!(currentPlan && currentPlan.id && currentPlan.theme && Array.isArray(currentPlan.scenes) && currentPlan.scenes.length);
    var currentPreflight = hasPlan ? safeEvaluatePreflight(currentPlan) : null;
    var currentManifest = null;

    root.innerHTML = `
      <style>
        .ec-wrap{ display:grid; gap:14px; }
        .ec-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .ec-item{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:10px 12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:4px;
        }
        .ec-item .k{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .ec-item .v{
          font-size:14px;
          font-weight:700;
          word-break:break-word;
        }
        .ec-actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:12px;
        }
        .ec-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .ec-title{
          font-size:14px;
          font-weight:900;
          letter-spacing:.3px;
        }
        .ec-badge{
          font-size:11px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.5px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
        }
        .ec-badge.is-pass{
          background:rgba(90,210,120,.12);
        }
        .ec-badge.is-block{
          background:rgba(255,110,110,.12);
        }
        .ec-summary{
          margin-top:10px;
          font-size:13px;
          line-height:1.4;
          opacity:.92;
        }
        .ec-preflight{
          margin-top:10px;
          border:1px solid rgba(255,255,255,.10);
          border-radius:14px;
          padding:14px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:12px;
        }
        .ec-preflight.is-pass{
          border-color: rgba(90,210,120,.35);
          box-shadow: 0 0 0 1px rgba(90,210,120,.12) inset;
        }
        .ec-preflight.is-block{
          border-color: rgba(255,110,110,.35);
          box-shadow: 0 0 0 1px rgba(255,110,110,.12) inset;
        }
        .ec-lists{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:14px;
        }
        .ec-subtitle{
          font-size:12px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.8;
          margin-bottom:6px;
        }
        .ec-list{
          margin:0;
          padding-left:18px;
          font-size:13px;
          line-height:1.4;
        }
        .ec-empty{
          border:1px dashed rgba(255,255,255,.18);
          border-radius:14px;
          padding:16px;
        }
        .ec-code{
          margin-top:10px;
          white-space:pre-wrap;
          word-break:break-word;
          font-size:12px;
          line-height:1.45;
        }

        @media (max-width: 640px){
          .ec-lists{ grid-template-columns:1fr; }
        }
      </style>

      <div class="ec-wrap">
        <div class="card">
          <h2>Export Center</h2>
          <p class="muted">
            Centro visual de exportação do projeto editorial.
            Nesta fase você confere o pipeline, o preflight e o manifesto JSON antes das futuras etapas de PDF e ZIP.
          </p>
          <div id="ec_area"></div>
        </div>
      </div>
    `;

    var area = root.querySelector('#ec_area');

    function paint(){
      currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
      hasPlan = !!(currentPlan && currentPlan.id && currentPlan.theme && Array.isArray(currentPlan.scenes) && currentPlan.scenes.length);
      currentPreflight = hasPlan ? safeEvaluatePreflight(currentPlan) : null;

      if (!hasPlan) {
        area.innerHTML = `
          <div class="ec-empty">
            <p class="muted"><b>Nenhum coloring project encontrado.</b></p>
            <div class="ec-actions">
              <button class="btn primary" id="ec_reload">Reload Project</button>
            </div>
            <p class="muted">Gere e salve um plano antes de usar o Export Center.</p>
          </div>
        `;

        var reloadOnlyBtn = area.querySelector('#ec_reload');
        if (reloadOnlyBtn) {
          reloadOnlyBtn.onclick = function(){
            currentManifest = null;
            paint();
            if (this.app && this.app.toast) this.app.toast('Project reloaded ✅');
          }.bind(this);
        }

        return;
      }

      area.innerHTML = `
        <div class="card">
          <h3>Book Summary</h3>
          ${renderBookSummary(currentPlan)}
        </div>

        <div class="card">
          <h3>Preflight Summary</h3>
          ${renderPreflight(currentPreflight)}
        </div>

        <div class="card">
          <h3>Manifest Summary</h3>
          ${renderManifestSummary(currentManifest)}
          ${currentManifest ? `<pre class="ec-code">${esc(JSON.stringify(currentManifest, null, 2))}</pre>` : ''}
        </div>

        <div class="ec-actions">
          <button class="btn primary" id="ec_build_manifest">Build Manifest</button>
          <button class="btn" id="ec_download_manifest">Download Manifest JSON</button>
          <button class="btn secondary" id="ec_reload">Reload Project</button>
        </div>
      `;

      var buildBtn = area.querySelector('#ec_build_manifest');
      var downloadBtn = area.querySelector('#ec_download_manifest');
      var reloadBtn = area.querySelector('#ec_reload');

      if (buildBtn) {
        buildBtn.onclick = function(){
          try {
            currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
            currentPreflight = safeEvaluatePreflight(currentPlan);
            currentManifest = safeBuildManifest(currentPlan, currentPreflight);

            paint();

            if (this.app && this.app.toast) this.app.toast('Manifest built ✅');
          } catch (e) {
            if (this.app && this.app.toast) this.app.toast('Failed to build manifest', 'err');
          }
        }.bind(this);
      }

      if (downloadBtn) {
        downloadBtn.onclick = function(){
          try {
            if (!currentManifest) {
              currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
              currentPreflight = safeEvaluatePreflight(currentPlan);
              currentManifest = safeBuildManifest(currentPlan, currentPreflight);
            }

            if (!currentManifest) {
              throw new Error('Manifest unavailable');
            }

            downloadJson(
              'coloring-export-manifest-' + (currentPlan.id || 'project') + '.json',
              currentManifest
            );

            if (this.app && this.app.toast) this.app.toast('Manifest downloaded ✅');
          } catch (e) {
            if (this.app && this.app.toast) this.app.toast('Failed to download manifest', 'err');
          }
        }.bind(this);
      }

      if (reloadBtn) {
        reloadBtn.onclick = function(){
          currentManifest = null;
          paint();
          if (this.app && this.app.toast) this.app.toast('Project reloaded ✅');
        }.bind(this);
      }
    }

    paint();
  }
}
