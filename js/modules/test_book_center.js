/* FILE: /js/modules/test_book_center.js */
// Bright Cup Creator — Test Book Center v0.1 SAFE
// Hub visual do pipeline de test book
// - sem backend
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { Storage } from '../core/storage.js';
import { buildTestBookDashboardPayload } from '../core/test_book_dashboard_payload.js';
import { buildTestBookExportPackage } from '../core/test_book_export_package.js';

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
  if (!isFinite(n)) return typeof fallback === 'number' ? fallback : 0;
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
    plan.scenes.length > 0
  );
}

function safeBuildTestBookDashboard(plan){
  try {
    return buildTestBookDashboardPayload(plan || {});
  } catch (e) {
    var safePlan = normalizePlan(plan || {});
    return {
      payloadVersion: '1.0',
      type: 'brightcup_test_book_dashboard_payload',
      generatedAt: '',
      status: 'blocked',
      header: {
        headline: 'Test Book bloqueado',
        summary: 'Não foi possível montar o dashboard do test book.'
      },
      book: {
        id: safePlan.id || '',
        theme: safePlan.theme || '',
        ageGroup: safePlan.ageGroup || '',
        language: safePlan.language || 'en',
        style: safePlan.style || '',
        pageTarget: safePlan.pageTarget || 0,
        status: safePlan.status || 'idle'
      },
      cards: {
        review: { label: 'Review', value: 'blocked', status: 'blocked' },
        pages: { label: 'Pages', value: '0', status: 'blocked' },
        package: { label: 'Package', value: 'blocked', status: 'blocked' },
        pipeline: { label: 'Pipeline', value: 'blocked', status: 'blocked' },
        publishing: { label: 'Publishing', value: 'blocked', status: 'blocked' }
      },
      indicators: [],
      alerts: ['test book dashboard unavailable'],
      actions: ['revisar estrutura do projeto']
    };
  }
}

function safeBuildTestBookExportPackage(plan){
  try {
    return buildTestBookExportPackage(plan || {});
  } catch (e) {
    var safePlan = normalizePlan(plan || {});
    return {
      packageVersion: '1.0',
      type: 'brightcup_test_book_export_package',
      generatedAt: '',
      book: {
        id: safePlan.id || '',
        theme: safePlan.theme || '',
        ageGroup: safePlan.ageGroup || '',
        language: safePlan.language || 'en',
        style: safePlan.style || '',
        pageTarget: safePlan.pageTarget || 0,
        status: safePlan.status || 'idle',
        createdAt: safePlan.createdAt || '',
        updatedAt: safePlan.updatedAt || '',
        notes: safePlan.notes || ''
      },
      dashboard: {},
      package: {},
      pipeline: {},
      readiness: {},
      testBook: {},
      exportFiles: {},
      exportStatus: 'blocked',
      summary: 'Test book export package unavailable.'
    };
  }
}

function statusClass(status){
  var s = normalizeText(status).toLowerCase();
  if (s === 'ready') return 'ready';
  if (s === 'partial') return 'partial';
  return 'blocked';
}

function downloadJson(filename, obj){
  var blob = new Blob([JSON.stringify(obj, null, 2)], { type:'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();

  setTimeout(function(){
    try { URL.revokeObjectURL(a.href); } catch (e) {}
  }, 4000);
}

function renderBookSummary(book){
  var safe = book && typeof book === 'object' ? book : {};

  return `
    <div class="tbc-grid">
      <div class="tbc-item"><span class="k">ID</span><span class="v">${esc(safe.id || '-')}</span></div>
      <div class="tbc-item"><span class="k">Theme</span><span class="v">${esc(safe.theme || '-')}</span></div>
      <div class="tbc-item"><span class="k">Age Group</span><span class="v">${esc(safe.ageGroup || '-')}</span></div>
      <div class="tbc-item"><span class="k">Language</span><span class="v">${esc(safe.language || '-')}</span></div>
      <div class="tbc-item"><span class="k">Style</span><span class="v">${esc(safe.style || '-')}</span></div>
      <div class="tbc-item"><span class="k">Page Target</span><span class="v">${esc(String(safe.pageTarget || 0))}</span></div>
      <div class="tbc-item"><span class="k">Status</span><span class="v">${esc(safe.status || '-')}</span></div>
    </div>
  `;
}

function renderCards(cards){
  var safe = cards && typeof cards === 'object' ? cards : {};
  var keys = ['review', 'pages', 'package', 'pipeline', 'publishing'];

  return `
    <div class="tbc-card-grid">
      ${keys.map(function(key){
        var card = safe[key] && typeof safe[key] === 'object' ? safe[key] : {};
        var st = statusClass(card.status || 'blocked');

        return `
          <div class="tbc-mini-card is-${esc(st)}">
            <div class="tbc-mini-label">${esc(card.label || key)}</div>
            <div class="tbc-mini-value">${esc(card.value || '-')}</div>
            <div class="tbc-mini-status">${esc(st)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderIndicators(indicators){
  var list = Array.isArray(indicators) ? indicators : [];

  if (!list.length) {
    return '<p class="muted">No indicators.</p>';
  }

  return `
    <div class="tbc-indicator-list">
      ${list.map(function(item){
        var st = statusClass(item && item.status);

        return `
          <div class="tbc-indicator is-${esc(st)}">
            <div class="tbc-indicator-top">
              <span class="tbc-indicator-label">${esc(item && (item.label || item.key) || '-')}</span>
              <span class="tbc-indicator-status">${esc(st)}</span>
            </div>
            <div class="tbc-indicator-value">${esc(String(item && item.value != null ? item.value : '-'))}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderStringList(items, emptyText){
  var list = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!list.length) {
    return '<p class="muted">' + esc(emptyText || 'No items.') + '</p>';
  }

  return '<ul class="tbc-list">' + list.map(function(item){
    return '<li>' + esc(item) + '</li>';
  }).join('') + '</ul>';
}

export class TestBookCenterModule {
  constructor(app){
    this.app = app;
    this.id = 'test_book_center';
    this.title = 'Test Book Center';
  }

  async init(){}

  render(root){
    var currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
    var hasPlan = hasUsablePlan(currentPlan);
    var currentDashboard = hasPlan ? safeBuildTestBookDashboard(currentPlan) : null;
    var currentExportPackage = hasPlan ? safeBuildTestBookExportPackage(currentPlan) : null;
    var self = this;

    root.innerHTML = `
      <style>
        .tbc-wrap{ display:grid; gap:14px; }
        .tbc-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .tbc-item{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:10px 12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:4px;
        }
        .tbc-item .k{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .tbc-item .v{
          font-size:14px;
          font-weight:700;
          word-break:break-word;
        }

        .tbc-status-hero{
          border:1px solid rgba(255,255,255,.10);
          border-radius:14px;
          padding:14px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:12px;
        }
        .tbc-status-hero.is-ready{
          border-color: rgba(90,210,120,.35);
          box-shadow: 0 0 0 1px rgba(90,210,120,.12) inset;
        }
        .tbc-status-hero.is-partial{
          border-color: rgba(255,210,90,.35);
          box-shadow: 0 0 0 1px rgba(255,210,90,.12) inset;
        }
        .tbc-status-hero.is-blocked{
          border-color: rgba(255,110,110,.35);
          box-shadow: 0 0 0 1px rgba(255,110,110,.12) inset;
        }

        .tbc-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .tbc-title{
          font-size:14px;
          font-weight:900;
          letter-spacing:.3px;
        }
        .tbc-badge{
          font-size:11px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.5px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
        }
        .tbc-badge.is-ready{
          background:rgba(90,210,120,.12);
        }
        .tbc-badge.is-partial{
          background:rgba(255,210,90,.12);
        }
        .tbc-badge.is-blocked{
          background:rgba(255,110,110,.12);
        }

        .tbc-headline{
          font-size:18px;
          font-weight:900;
          line-height:1.2;
        }
        .tbc-summary{
          font-size:13px;
          line-height:1.45;
          opacity:.92;
        }

        .tbc-card-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .tbc-mini-card{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:6px;
        }
        .tbc-mini-card.is-ready{
          border-color: rgba(90,210,120,.30);
        }
        .tbc-mini-card.is-partial{
          border-color: rgba(255,210,90,.30);
        }
        .tbc-mini-card.is-blocked{
          border-color: rgba(255,110,110,.30);
        }
        .tbc-mini-label{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .tbc-mini-value{
          font-size:16px;
          font-weight:900;
          line-height:1.2;
          word-break:break-word;
        }
        .tbc-mini-status{
          font-size:11px;
          font-weight:800;
          text-transform:uppercase;
          opacity:.8;
        }

        .tbc-indicator-list{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .tbc-indicator{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:10px 12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:8px;
        }
        .tbc-indicator.is-ready{
          border-color: rgba(90,210,120,.30);
        }
        .tbc-indicator.is-partial{
          border-color: rgba(255,210,90,.30);
        }
        .tbc-indicator.is-blocked{
          border-color: rgba(255,110,110,.30);
        }
        .tbc-indicator-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
        }
        .tbc-indicator-label{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .tbc-indicator-status{
          font-size:10px;
          font-weight:900;
          text-transform:uppercase;
          opacity:.8;
        }
        .tbc-indicator-value{
          font-size:18px;
          font-weight:900;
        }

        .tbc-actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:12px;
        }

        .tbc-list{
          margin:0;
          padding-left:18px;
          font-size:13px;
          line-height:1.45;
        }

        .tbc-empty{
          border:1px dashed rgba(255,255,255,.18);
          border-radius:14px;
          padding:16px;
        }

        .tbc-code{
          margin-top:10px;
          white-space:pre-wrap;
          word-break:break-word;
          font-size:12px;
          line-height:1.45;
        }
      </style>

      <div class="tbc-wrap">
        <div class="card">
          <h2>Test Book Center</h2>
          <p class="muted">
            Hub visual dedicado ao pipeline de test book.
            Nesta fase você acompanha o estado lógico do livro de teste e do pacote exportável correspondente.
          </p>
          <div id="tbc_area"></div>
        </div>
      </div>
    `;

    var area = root.querySelector('#tbc_area');

    function rebuildAll(){
      currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
      hasPlan = hasUsablePlan(currentPlan);
      currentDashboard = hasPlan ? safeBuildTestBookDashboard(currentPlan) : null;
      currentExportPackage = hasPlan ? safeBuildTestBookExportPackage(currentPlan) : null;
    }

    function paint(){
      rebuildAll();

      if (!hasPlan) {
        area.innerHTML = `
          <div class="tbc-empty">
            <p class="muted"><b>Nenhum coloring project encontrado.</b></p>
            <div class="tbc-actions">
              <button class="btn primary" id="tbc_reload">Reload Project</button>
            </div>
            <p class="muted">Gere e salve um projeto antes de usar o Test Book Center.</p>
          </div>
        `;

        var reloadOnlyBtn = area.querySelector('#tbc_reload');
        if (reloadOnlyBtn) {
          reloadOnlyBtn.onclick = function(){
            paint();
            if (self.app && self.app.toast) self.app.toast('Project reloaded ✅');
          };
        }
        return;
      }

      var status = statusClass(currentDashboard && currentDashboard.status);
      var header = currentDashboard && currentDashboard.header ? currentDashboard.header : {};
      var book = currentDashboard && currentDashboard.book ? currentDashboard.book : {};
      var cards = currentDashboard && currentDashboard.cards ? currentDashboard.cards : {};
      var indicators = currentDashboard && currentDashboard.indicators ? currentDashboard.indicators : [];
      var alerts = currentDashboard && currentDashboard.alerts ? currentDashboard.alerts : [];
      var actions = currentDashboard && currentDashboard.actions ? currentDashboard.actions : [];

      area.innerHTML = `
        <div class="card">
          <div class="tbc-status-hero is-${esc(status)}">
            <div class="tbc-head">
              <div class="tbc-title">Test Book Status</div>
              <div class="tbc-badge is-${esc(status)}">${esc(status)}</div>
            </div>
            <div class="tbc-headline">${esc(header.headline || '-')}</div>
            <div class="tbc-summary">${esc(header.summary || '-')}</div>
          </div>
        </div>

        <div class="card">
          <h3>Book Summary</h3>
          ${renderBookSummary(book)}
        </div>

        <div class="card">
          <h3>Status Cards</h3>
          ${renderCards(cards)}
        </div>

        <div class="card">
          <h3>Indicators</h3>
          ${renderIndicators(indicators)}
        </div>

        <div class="card">
          <h3>Alerts</h3>
          ${renderStringList(alerts, 'No alerts.')}
        </div>

        <div class="card">
          <h3>Actions</h3>
          ${renderStringList(actions, 'No actions.')}
        </div>

        <div class="card">
          <h3>Test Book Dashboard JSON</h3>
          <pre class="tbc-code">${esc(JSON.stringify(currentDashboard, null, 2))}</pre>
        </div>

        <div class="card">
          <h3>Test Book Export Package JSON</h3>
          <pre class="tbc-code">${esc(JSON.stringify(currentExportPackage, null, 2))}</pre>
        </div>

        <div class="tbc-actions">
          <button class="btn primary" id="tbc_rebuild">Rebuild Test Book Data</button>
          <button class="btn" id="tbc_download_dashboard">Download Test Book Dashboard JSON</button>
          <button class="btn" id="tbc_download_export">Download Test Book Export Package JSON</button>
          <button class="btn secondary" id="tbc_reload">Reload Project</button>
        </div>
      `;

      var rebuildBtn = area.querySelector('#tbc_rebuild');
      var downloadDashboardBtn = area.querySelector('#tbc_download_dashboard');
      var downloadExportBtn = area.querySelector('#tbc_download_export');
      var reloadBtn = area.querySelector('#tbc_reload');

      if (rebuildBtn) {
        rebuildBtn.onclick = function(){
          try {
            rebuildAll();
            paint();
            if (self.app && self.app.toast) self.app.toast('Test book data rebuilt ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to rebuild test book data', 'err');
          }
        };
      }

      if (downloadDashboardBtn) {
        downloadDashboardBtn.onclick = function(){
          try {
            if (!currentDashboard) {
              rebuildAll();
            }
            if (!currentDashboard) {
              throw new Error('Test book dashboard unavailable');
            }

            downloadJson(
              'test-book-dashboard-' + (currentPlan.id || 'project') + '.json',
              currentDashboard
            );

            if (self.app && self.app.toast) self.app.toast('Test book dashboard downloaded ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to download test book dashboard', 'err');
          }
        };
      }

      if (downloadExportBtn) {
        downloadExportBtn.onclick = function(){
          try {
            if (!currentExportPackage) {
              rebuildAll();
            }
            if (!currentExportPackage) {
              throw new Error('Test book export package unavailable');
            }

            downloadJson(
              'test-book-export-package-' + (currentPlan.id || 'project') + '.json',
              currentExportPackage
            );

            if (self.app && self.app.toast) self.app.toast('Test book export package downloaded ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to download test book export package', 'err');
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
