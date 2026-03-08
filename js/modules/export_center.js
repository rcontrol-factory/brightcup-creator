/* FILE: /js/modules/export_center.js */
// Bright Cup Creator — Export Center v0.5 SAFE
// Consolida visualmente a etapa final do pipeline de exportação
// - preflight
// - manifest
// - metadata
// - package
// - zip payload
// - ainda sem PDF real
// - ainda sem ZIP real
// - sem dependências externas
// - compatível com Safari/iOS

import { Storage } from '../core/storage.js';
import { evaluateColoringPreflight } from '../core/preflight_gate.js';
import { buildColoringExportManifest } from '../core/export_manifest.js';
import { buildColoringMetadata } from '../core/metadata_builder.js';
import { buildColoringProjectBundle } from '../core/project_bundle.js';
import { buildColoringExportPackage } from '../core/export_package.js';
import { buildZipExportPayload } from '../core/zip_export.js';

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
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

function normalizeReviewStatus(status){
  var s = normalizeText(status).toLowerCase();
  if (s === 'approved_for_book') return 'approved_for_book';
  if (s === 'rejected') return 'rejected';
  if (s === 'needs_redo') return 'needs_redo';
  return 'pending_review';
}

function normalizeScene(scene){
  var src = scene && typeof scene === 'object' ? clone(scene) : {};
  var review = src.review && typeof src.review === 'object' ? src.review : {};

  return {
    id: normalizeText(src.id),
    title: normalizeText(src.title),
    promptBase: normalizeText(src.promptBase),
    status: normalizeText(src.status || 'pending') || 'pending',
    attempts: Math.max(0, toInt(src.attempts, 0)),
    tags: Array.isArray(src.tags) ? src.tags.map(function(tag){
      return normalizeText(tag);
    }).filter(Boolean) : [],
    processingAt: normalizeText(src.processingAt),
    approvedAt: normalizeText(src.approvedAt),
    rejectedAt: normalizeText(src.rejectedAt),
    rejectionReason: normalizeText(src.rejectionReason),
    output: src.output != null ? clone(src.output) : null,
    review: {
      status: normalizeReviewStatus(review.status),
      reviewedAt: normalizeText(review.reviewedAt),
      note: normalizeText(review.note)
    }
  };
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
    createdAt: normalizeText(src.createdAt),
    updatedAt: normalizeText(src.updatedAt),
    notes: normalizeText(src.notes),
    pending: Array.isArray(src.pending) ? src.pending.map(function(id){
      return normalizeText(id);
    }).filter(Boolean) : [],
    approved: Array.isArray(src.approved) ? src.approved.map(function(id){
      return normalizeText(id);
    }).filter(Boolean) : [],
    rejected: Array.isArray(src.rejected) ? src.rejected.map(function(id){
      return normalizeText(id);
    }).filter(Boolean) : [],
    scenes: Array.isArray(src.scenes) ? src.scenes.map(normalizeScene) : []
  };
}

function hasUsablePlan(plan){
  return !!(
    plan &&
    plan.id &&
    plan.theme &&
    Array.isArray(plan.scenes) &&
    plan.scenes.length
  );
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
        totalScenes: Array.isArray(plan && plan.scenes) ? plan.scenes.length : 0,
        approvedForBook: 0,
        rejected: 0,
        needsRedo: 0,
        pendingReview: 0,
        pageTarget: plan && plan.pageTarget ? plan.pageTarget : 0
      },
      summary: 'Preflight failed.'
    };
  }
}

function safeBuildManifest(plan, preflight){
  try {
    return buildColoringExportManifest(plan || {}, preflight || {});
  } catch (e) {
    return {
      manifestVersion: '1.0',
      exportType: 'coloring_book_project',
      generatedAt: '',
      book: {
        id: normalizeText(plan && plan.id),
        theme: normalizeText(plan && plan.theme),
        ageGroup: normalizeText(plan && plan.ageGroup),
        language: normalizeText(plan && plan.language || 'en') || 'en',
        style: normalizeText(plan && plan.style),
        pageTarget: Math.max(0, toInt(plan && plan.pageTarget, 0)),
        status: normalizeText(plan && plan.status || 'idle') || 'idle',
        createdAt: normalizeText(plan && plan.createdAt),
        updatedAt: normalizeText(plan && plan.updatedAt),
        notes: normalizeText(plan && plan.notes)
      },
      scenes: [],
      review: {
        totalScenes: Array.isArray(plan && plan.scenes) ? plan.scenes.length : 0,
        approvedForBook: 0,
        rejected: 0,
        needsRedo: 0,
        pendingReview: 0
      },
      preflight: clone(preflight || {})
    };
  }
}

function safeBuildMetadata(plan){
  try {
    return buildColoringMetadata(plan || {});
  } catch (e) {
    return {
      metadataVersion: '1.0',
      type: 'coloring_book_metadata',
      generatedAt: '',
      title: '',
      subtitle: '',
      theme: normalizeText(plan && plan.theme),
      ageGroup: normalizeText(plan && plan.ageGroup),
      language: normalizeText(plan && plan.language || 'en') || 'en',
      style: normalizeText(plan && plan.style),
      description: '',
      keywords: [],
      categories: []
    };
  }
}

function safeBuildBundle(plan){
  try {
    return buildColoringProjectBundle(plan || {});
  } catch (e) {
    return {
      bundleVersion: '1.0',
      type: 'brightcup_coloring_project_bundle',
      generatedAt: '',
      plan: clone(plan || {}),
      preflight: safeEvaluatePreflight(plan || {}),
      manifest: safeBuildManifest(plan || {}, safeEvaluatePreflight(plan || {})),
      metadata: safeBuildMetadata(plan || {})
    };
  }
}

function safeBuildPackage(plan){
  try {
    return buildColoringExportPackage(plan || {});
  } catch (e) {
    var normalized = normalizePlan(plan || {});
    return {
      packageVersion: '1.0',
      type: 'brightcup_export_package',
      generatedAt: '',
      files: {
        'bundle.json': safeBuildBundle(normalized),
        'metadata.json': safeBuildMetadata(normalized),
        'manifest.json': safeBuildManifest(normalized, safeEvaluatePreflight(normalized)),
        'plan.json': normalized
      }
    };
  }
}

function safeBuildZipPayload(pkg){
  try {
    return buildZipExportPayload(pkg || {});
  } catch (e) {
    return {
      zipVersion: '1.0',
      type: 'brightcup_zip_export',
      generatedAt: '',
      files: []
    };
  }
}

function downloadJson(filename, obj){
  var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');

  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();

  setTimeout(function(){
    try { URL.revokeObjectURL(a.href); } catch (e) {}
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

function renderMetadataSummary(metadata){
  if (!metadata) {
    return `
      <div class="ec-grid">
        <div class="ec-item"><span class="k">Title</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Subtitle</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Language</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Keywords Count</span><span class="v">0</span></div>
        <div class="ec-item"><span class="k">Categories Count</span><span class="v">0</span></div>
      </div>
      <div class="ec-summary">-</div>
    `;
  }

  var keywordsCount = Array.isArray(metadata.keywords) ? metadata.keywords.length : 0;
  var categoriesCount = Array.isArray(metadata.categories) ? metadata.categories.length : 0;

  return `
    <div class="ec-grid">
      <div class="ec-item"><span class="k">Title</span><span class="v">${esc(metadata.title || '-')}</span></div>
      <div class="ec-item"><span class="k">Subtitle</span><span class="v">${esc(metadata.subtitle || '-')}</span></div>
      <div class="ec-item"><span class="k">Language</span><span class="v">${esc(metadata.language || '-')}</span></div>
      <div class="ec-item"><span class="k">Keywords Count</span><span class="v">${esc(String(keywordsCount))}</span></div>
      <div class="ec-item"><span class="k">Categories Count</span><span class="v">${esc(String(categoriesCount))}</span></div>
    </div>
    <div class="ec-summary">${esc(metadata.description || '-')}</div>
  `;
}

function renderBundleSummary(bundle){
  if (!bundle) {
    return `
      <div class="ec-grid">
        <div class="ec-item"><span class="k">Type</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Bundle Version</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Generated At</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Has Plan</span><span class="v">false</span></div>
      </div>
    `;
  }

  return `
    <div class="ec-grid">
      <div class="ec-item"><span class="k">Type</span><span class="v">${esc(bundle.type || '-')}</span></div>
      <div class="ec-item"><span class="k">Bundle Version</span><span class="v">${esc(bundle.bundleVersion || '-')}</span></div>
      <div class="ec-item"><span class="k">Generated At</span><span class="v">${esc(bundle.generatedAt || '-')}</span></div>
      <div class="ec-item"><span class="k">Has Plan</span><span class="v">${esc(String(!!bundle.plan))}</span></div>
    </div>
  `;
}

function renderPackageSummary(pkg){
  if (!pkg) {
    return `
      <div class="ec-grid">
        <div class="ec-item"><span class="k">Type</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Package Version</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Generated At</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Files Count</span><span class="v">0</span></div>
      </div>
    `;
  }

  var files = pkg.files && typeof pkg.files === 'object' ? pkg.files : {};
  var filesCount = Object.keys(files).length;

  return `
    <div class="ec-grid">
      <div class="ec-item"><span class="k">Type</span><span class="v">${esc(pkg.type || '-')}</span></div>
      <div class="ec-item"><span class="k">Package Version</span><span class="v">${esc(pkg.packageVersion || '-')}</span></div>
      <div class="ec-item"><span class="k">Generated At</span><span class="v">${esc(pkg.generatedAt || '-')}</span></div>
      <div class="ec-item"><span class="k">Files Count</span><span class="v">${esc(String(filesCount))}</span></div>
    </div>
  `;
}

function renderZipPayloadSummary(payload){
  if (!payload) {
    return `
      <div class="ec-grid">
        <div class="ec-item"><span class="k">Type</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">ZIP Version</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Generated At</span><span class="v">-</span></div>
        <div class="ec-item"><span class="k">Files Count</span><span class="v">0</span></div>
      </div>
    `;
  }

  var files = Array.isArray(payload.files) ? payload.files : [];
  return `
    <div class="ec-grid">
      <div class="ec-item"><span class="k">Type</span><span class="v">${esc(payload.type || '-')}</span></div>
      <div class="ec-item"><span class="k">ZIP Version</span><span class="v">${esc(payload.zipVersion || '-')}</span></div>
      <div class="ec-item"><span class="k">Generated At</span><span class="v">${esc(payload.generatedAt || '-')}</span></div>
      <div class="ec-item"><span class="k">Files Count</span><span class="v">${esc(String(files.length))}</span></div>
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
    var hasPlan = hasUsablePlan(currentPlan);

    var currentPreflight = hasPlan ? safeEvaluatePreflight(currentPlan) : null;
    var currentManifest = hasPlan ? safeBuildManifest(currentPlan, currentPreflight) : null;
    var currentMetadata = hasPlan ? safeBuildMetadata(currentPlan) : null;
    var currentBundle = hasPlan ? safeBuildBundle(currentPlan) : null;
    var currentPackage = hasPlan ? safeBuildPackage(currentPlan) : null;
    var currentZipPayload = currentPackage ? safeBuildZipPayload(currentPackage) : null;

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
            Nesta fase você confere o pipeline completo e pode baixar os JSONs editoriais finais com segurança.
          </p>
          <div id="ec_area"></div>
        </div>
      </div>
    `;

    var area = root.querySelector('#ec_area');
    var self = this;

    function rebuildAll(){
      currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
      hasPlan = hasUsablePlan(currentPlan);

      currentPreflight = hasPlan ? safeEvaluatePreflight(currentPlan) : null;
      currentManifest = hasPlan ? safeBuildManifest(currentPlan, currentPreflight) : null;
      currentMetadata = hasPlan ? safeBuildMetadata(currentPlan) : null;
      currentBundle = hasPlan ? safeBuildBundle(currentPlan) : null;
      currentPackage = hasPlan ? safeBuildPackage(currentPlan) : null;
      currentZipPayload = currentPackage ? safeBuildZipPayload(currentPackage) : null;
    }

    function paint(){
      rebuildAll();

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
            paint();
            if (self.app && self.app.toast) self.app.toast('Project reloaded ✅');
          };
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

        <div class="card">
          <h3>Metadata Summary</h3>
          ${renderMetadataSummary(currentMetadata)}
          ${currentMetadata ? `<pre class="ec-code">${esc(JSON.stringify(currentMetadata, null, 2))}</pre>` : ''}
        </div>

        <div class="card">
          <h3>Bundle Summary</h3>
          ${renderBundleSummary(currentBundle)}
          ${currentBundle ? `<pre class="ec-code">${esc(JSON.stringify(currentBundle, null, 2))}</pre>` : ''}
        </div>

        <div class="card">
          <h3>Package Summary</h3>
          ${renderPackageSummary(currentPackage)}
          ${currentPackage ? `<pre class="ec-code">${esc(JSON.stringify(currentPackage, null, 2))}</pre>` : ''}
        </div>

        <div class="card">
          <h3>ZIP Payload Summary</h3>
          ${renderZipPayloadSummary(currentZipPayload)}
          ${currentZipPayload ? `<pre class="ec-code">${esc(JSON.stringify(currentZipPayload, null, 2))}</pre>` : ''}
        </div>

        <div class="ec-actions">
          <button class="btn primary" id="ec_rebuild">Rebuild Export Data</button>
          <button class="btn" id="ec_download_manifest">Download Manifest JSON</button>
          <button class="btn" id="ec_download_metadata">Download Metadata JSON</button>
          <button class="btn" id="ec_download_package">Download Export Package JSON</button>
          <button class="btn" id="ec_download_zip_payload">Download ZIP Payload JSON</button>
          <button class="btn secondary" id="ec_reload">Reload Project</button>
        </div>
      `;

      var rebuildBtn = area.querySelector('#ec_rebuild');
      var downloadManifestBtn = area.querySelector('#ec_download_manifest');
      var downloadMetadataBtn = area.querySelector('#ec_download_metadata');
      var downloadPackageBtn = area.querySelector('#ec_download_package');
      var downloadZipPayloadBtn = area.querySelector('#ec_download_zip_payload');
      var reloadBtn = area.querySelector('#ec_reload');

      if (rebuildBtn) {
        rebuildBtn.onclick = function(){
          try {
            rebuildAll();
            paint();
            if (self.app && self.app.toast) self.app.toast('Export data rebuilt ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to rebuild export data', 'err');
          }
        };
      }

      if (downloadManifestBtn) {
        downloadManifestBtn.onclick = function(){
          try {
            if (!currentManifest) rebuildAll();
            if (!currentManifest) throw new Error('Manifest unavailable');

            downloadJson(
              'coloring-export-manifest-' + (currentPlan.id || 'project') + '.json',
              currentManifest
            );

            if (self.app && self.app.toast) self.app.toast('Manifest downloaded ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to download manifest', 'err');
          }
        };
      }

      if (downloadMetadataBtn) {
        downloadMetadataBtn.onclick = function(){
          try {
            if (!currentMetadata) rebuildAll();
            if (!currentMetadata) throw new Error('Metadata unavailable');

            downloadJson(
              'metadata-' + (currentPlan.id || 'project') + '.json',
              currentMetadata
            );

            if (self.app && self.app.toast) self.app.toast('Metadata downloaded ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to download metadata', 'err');
          }
        };
      }

      if (downloadPackageBtn) {
        downloadPackageBtn.onclick = function(){
          try {
            if (!currentPackage) rebuildAll();
            if (!currentPackage) throw new Error('Package unavailable');

            downloadJson(
              'export-package-' + (currentPlan.id || 'project') + '.json',
              currentPackage
            );

            if (self.app && self.app.toast) self.app.toast('Export package downloaded ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to download package', 'err');
          }
        };
      }

      if (downloadZipPayloadBtn) {
        downloadZipPayloadBtn.onclick = function(){
          try {
            if (!currentZipPayload) rebuildAll();
            if (!currentZipPayload) throw new Error('ZIP payload unavailable');

            downloadJson(
              'zip-payload-' + (currentPlan.id || 'project') + '.json',
              currentZipPayload
            );

            if (self.app && self.app.toast) self.app.toast('ZIP payload downloaded ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to download ZIP payload', 'err');
          }
        };
      }

      if (reloadBtn) {
        reloadBtn.onclick = function(){
          paint();
          if (self.app && self.app.toast) self.app.toast('Project reloaded ✅');
        };
      }
    }

    paint();
  }
}
