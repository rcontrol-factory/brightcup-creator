/* FILE: /js/modules/master_test_book_center.js */
// Bright Cup Creator — Master Test Book Center v0.1 SAFE
// Hub visual da trilha MASTER TEST BOOK
// - usa master_test_book_dashboard_payload.js
// - entrada leve
// - JSON sob demanda
// - sem backend
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { Storage } from '../core/storage.js';
import { buildMasterTestBookDashboardPayload } from '../core/master_test_book_dashboard_payload.js';

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

function safeBuildMasterTestBookDashboard(plan){
  try {
    return buildMasterTestBookDashboardPayload(plan || {});
  } catch (e) {
    var safePlan = normalizePlan(plan || {});
    return {
      payloadVersion: '1.0',
      type: 'brightcup_master_test_book_dashboard_payload',
      generatedAt: '',
      status: 'blocked',
      header: {
        headline: 'Master Test Book ainda bloqueado',
        summary: 'Não foi possível montar o dashboard master do test book.'
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
        pipeline: { label: 'Pipeline', value: 'blocked', status: 'blocked' },
        package: { label: 'Package', value: 'blocked', status: 'blocked' },
        export: { label: 'Export', value: 'blocked', status: 'blocked' }
      },
      indicators: [],
      alerts: ['master test book dashboard unavailable'],
      actions: ['review project structure']
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
    <div class="mtbc-grid">
      <div class="mtbc-item"><span class="k">ID</span><span class="v">${esc(safe.id || '-')}</span></div>
      <div class="mtbc-item"><span class="k">Theme</span><span class="v">${esc(safe.theme || '-')}</span></div>
      <div class="mtbc-item"><span class="k">Age Group</span><span class="v">${esc(safe.ageGroup || '-')}</span></div>
      <div class="mtbc-item"><span class="k">Language</span><span class="v">${esc(safe.language || '-')}</span></div>
      <div class="mtbc-item"><span class="k">Style</span><span class="v">${esc(safe.style || '-')}</span></div>
      <div class="mtbc-item"><span class="k">Page Target</span><span class="v">${esc(String(safe.pageTarget || 0))}</span></div>
      <div class="mtbc-item"><span class="k">Status</span><span class="v">${esc(safe.status || '-')}</span></div>
    </div>
  `;
}

function renderCards(cards){
  var safe = cards && typeof cards === 'object' ? cards : {};
  var keys = ['review', 'pages', 'pipeline', 'package', 'export'];

  return `
    <div class="mtbc-card-grid">
      ${keys.map(function(key){
        var card = safe[key] && typeof safe[key] === 'object' ? safe[key] : {};
        var st = statusClass(card.status || 'blocked');

        return `
          <div class="mtbc-mini-card is-${esc(st)}">
            <div class="mtbc-mini-label">${esc(card.label || key)}</div>
            <div class="mtbc-mini-value">${esc(card.value || '-')}</div>
            <div class="mtbc-mini-status">${esc(st)}</div>
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
    <div class="mtbc-indicator-list">
      ${list.map(function(item){
        var st = statusClass(item && item.status);

        return `
          <div class="mtbc-indicator is-${esc(st)}">
            <div class="mtbc-indicator-top">
              <span class="mtbc-indicator-label">${esc(item && (item.label || item.key) || '-')}</span>
              <span class="mtbc-indicator-status">${esc(st)}</span>
            </div>
            <div class="mtbc-indicator-value">${esc(String(item && item.value != null ? item.value : '-'))}</div>
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

  return '<ul class="mtbc-list">' + list.map(function(item){
    return '<li>' + esc(item) + '</li>';
  }).join('') + '</ul>';
}

export class MasterTestBookCenterModule {
  constructor(app){
    this.app = app;
    this.id = 'master_test_book_center';
    this.title = 'Master Test Book Center';
  }

  async init(){}

  render(root){
    var currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
    var hasPlan = hasUsablePlan(currentPlan);
    var currentDashboard = hasPlan ? safeBuildMasterTestBookDashboard(currentPlan) : null;
    var showDashboardJson = false;
    var self = this;

    root.innerHTML = `
      <style>
        .mtbc-wrap{ display:grid; gap:14px; }
        .mtbc-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .mtbc-item{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:10px 12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:4px;
        }
        .mtbc-item .k{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .mtbc-item .v{
          font-size:14px;
          font-weight:700;
          word-break:break-word;
        }

        .mtbc-status-hero{
          border:1px solid rgba(255,255,255,.10);
          border-radius:14px;
          padding:14px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:12px;
        }
        .mtbc-status-hero.is-ready{
          border-color: rgba(90,210,120,.35);
          box-shadow: 0 0 0 1px rgba(90,210,120,.12) inset;
        }
        .mtbc-status-hero.is-partial{
          border-color: rgba(255,210,90,.35);
          box-shadow: 0 0 0 1px rgba(255,210,90,.12) inset;
        }
        .mtbc-status-hero.is-blocked{
          border-color: rgba(255,110,110,.35);
          box-shadow: 0 0 0 1px rgba(255,110,110,.12) inset;
        }

        .mtbc-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .mtbc-title{
          font-size:14px;
          font-weight:900;
          letter-spacing:.3px;
        }
        .mtbc-badge{
          font-size:11px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.5px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
        }
        .mtbc-badge.is-ready{
          background:rgba(90,210,120,.12);
        }
        .mtbc-badge.is-partial{
          background:rgba(255,210,90,.12);
        }
        .mtbc-badge.is-blocked{
          background:rgba(255,110,110,.12);
        }

        .mtbc-headline{
          font-size:18px;
          font-weight:900;
          line-height:1.2;
        }
        .mtbc-summary{
          font-size:13px;
          line-height:1.45;
          opacity:.92;
        }

        .mtbc-card-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .mtbc-mini-card{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:6px;
        }
        .mtbc-mini-card.is-ready{
          border-color: rgba(90,210,120,.30);
        }
        .mtbc-mini-card.is-partial{
          border-color: rgba(255,210,90,.30);
        }
        .mtbc-mini-card.is-blocked{
          border-color: rgba(255,110,110,.30);
        }
        .mtbc-mini-label{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .mtbc-mini-value{
          font-size:16px;
          font-weight:900;
          line-height:1.2;
          word-break:break-word;
        }
        .mtbc-mini-status{
          font-size:11px;
          font-weight:800;
          text-transform:uppercase;
          opacity:.8;
        }

        .mtbc-indicator-list{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .mtbc-indicator{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:10px 12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:8px;
        }
        .mtbc-indicator.is-ready{
          border-color: rgba(90,210,120,.30);
        }
        .mtbc-indicator.is-partial{
          border-color: rgba(255,210,90,.30);
        }
        .mtbc-indicator.is-blocked{
          border-color: rgba(255,110,110,.30);
        }
        .mtbc-indicator-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
        }
        .mtbc-indicator-label{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .mtbc-indicator-status{
          font-size:10px;
          font-weight:900;
          text-transform:uppercase;
          opacity:.8;
        }
        .mtbc-indicator-value{
          font-size:18px;
          font-weight:900;
        }

        .mtbc-actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:12px;
        }

        .mtbc-list{
          margin:0;
          padding-left:18px;
          font-size:13px;
          line-height:1.45;
        }

        .mtbc-empty{
          border:1px dashed rgba(255,255,255,.18);
          border-radius:14px;
          padding:16px;
        }

        .mtbc-code{
          margin-top:10px;
          white-space:pre-wrap;
          word-break:break-word;
          font-size:12px;
          line-height:1.45;
        }
      </style>

      <div class="mtbc-wrap">
        <div class="card">
          <h2>Master Test Book Center</h2>
          <p class="muted">
            Esta é a camada visual consolidada da trilha master do test book.
            Aqui você acompanha o estado geral consolidado antes de qualquer futura etapa visual mais pesada.
          </p>
          <div id="mtbc_area"></div>
        </div>
      </div>
    `;

    var area = root.querySelector('#mtbc_area');

    function rebuildAll(){
      currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
      hasPlan = hasUsablePlan(currentPlan);
      currentDashboard = hasPlan ? safeBuildMasterTestBookDashboard(currentPlan) : null;
    }

    function bindActions(){
      var rebuildBtn = area.querySelector('#mtbc_rebuild');
      var downloadDashboardBtn = area.querySelector('#mtbc_download_dashboard');
      var reloadBtn = area.querySelector('#mtbc_reload');
      var toggleDashboardBtn = area.querySelector('#mtbc_toggle_dashboard_json');

      if (rebuildBtn) {
        rebuildBtn.onclick = function(){
          try {
            rebuildAll();
            renderContent();
            if (self.app && self.app.toast) self.app.toast('Master test book data rebuilt ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to rebuild master test book data', 'err');
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
              throw new Error('Master test book dashboard unavailable');
            }

            downloadJson(
              'master-test-book-dashboard-' + (currentPlan.id || 'project') + '.json',
              currentDashboard
            );

            if (self.app && self.app.toast) self.app.toast('Master test book dashboard downloaded ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to download master test book dashboard', 'err');
          }
        };
      }

      if (reloadBtn) {
        reloadBtn.onclick = function(){
          paint();
          if (self.app && self.app.toast) self.app.toast('Project reloaded ✅');
        };
      }

      if (toggleDashboardBtn) {
        toggleDashboardBtn.onclick = function(){
          showDashboardJson = !showDashboardJson;
          renderJsonBlocks();
        };
      }
    }

    function renderJsonBlocks(){
      var dashboardWrap = area.querySelector('#mtbc_dashboard_json_wrap');
      var toggleDashboardBtn = area.querySelector('#mtbc_toggle_dashboard_json');

      if (toggleDashboardBtn) {
        toggleDashboardBtn.textContent = showDashboardJson ? 'Hide Master Test Book Dashboard JSON' : 'Show Master Test Book Dashboard JSON';
      }

      if (dashboardWrap) {
        dashboardWrap.innerHTML = showDashboardJson
          ? '<pre class="mtbc-code">' + esc(JSON.stringify(currentDashboard, null, 2)) + '</pre>'
          : '';
      }
    }

    function renderContent(){
      if (!hasPlan) {
        area.innerHTML = `
          <div class="mtbc-empty">
            <p class="muted"><b>Nenhum coloring project encontrado.</b></p>
            <div class="mtbc-actions">
              <button class="btn primary" id="mtbc_reload">Reload Project</button>
            </div>
            <p class="muted">Gere e salve um projeto antes de usar o Master Test Book Center.</p>
          </div>
        `;

        var reloadOnlyBtn = area.querySelector('#mtbc_reload');
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
          <div class="mtbc-status-hero is-${esc(status)}">
            <div class="mtbc-head">
              <div class="mtbc-title">Master Test Book Status</div>
              <div class="mtbc-badge is-${esc(status)}">${esc(status)}</div>
            </div>
            <div class="mtbc-headline">${esc(header.headline || '-')}</div>
            <div class="mtbc-summary">${esc(header.summary || '-')}</div>
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
          <h3>Master Test Book Dashboard JSON</h3>
          <button class="btn" id="mtbc_toggle_dashboard_json">Show Master Test Book Dashboard JSON</button>
          <div id="mtbc_dashboard_json_wrap"></div>
        </div>

        <div class="mtbc-actions">
          <button class="btn primary" id="mtbc_rebuild">Rebuild Master Test Book Data</button>
          <button class="btn" id="mtbc_download_dashboard">Download Master Test Book Dashboard JSON</button>
          <button class="btn secondary" id="mtbc_reload">Reload Project</button>
        </div>
      `;

      bindActions();
      renderJsonBlocks();
    }

    function paint(){
      rebuildAll();
      renderContent();
    }

    paint();
  }
}
