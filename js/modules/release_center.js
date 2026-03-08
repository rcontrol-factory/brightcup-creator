/* FILE: /js/modules/release_center.js */
// Bright Cup Creator — Release Center v0.1 SAFE
// Primeira tela visual dedicada ao estado final de release do projeto
// - usa release_dashboard_payload.js
// - hub visual final acima do Export Center
// - sem backend
// - sem imagem real
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { Storage } from '../core/storage.js';
import { buildReleaseDashboardPayload } from '../core/release_dashboard_payload.js';

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

function safeBuildReleaseDashboard(plan){
  try {
    return buildReleaseDashboardPayload(plan || {});
  } catch (e) {
    var safePlan = normalizePlan(plan || {});
    return {
      payloadVersion: '1.0',
      type: 'brightcup_release_dashboard_payload',
      generatedAt: '',
      status: 'blocked',
      header: {
        headline: 'Projeto ainda bloqueado',
        summary: 'Não foi possível montar o dashboard de release.'
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
        review: { label: 'Review', value: 'unavailable', status: 'blocked' },
        interior: { label: 'Interior', value: 'unavailable', status: 'blocked' },
        cover: { label: 'Cover', value: 'unavailable', status: 'blocked' },
        delivery: { label: 'Delivery', value: 'unavailable', status: 'blocked' },
        release: { label: 'Release', value: 'blocked', status: 'blocked' }
      },
      indicators: [],
      alerts: ['release dashboard unavailable'],
      actions: ['revisar pendências editoriais']
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
    <div class="rc-grid">
      <div class="rc-item"><span class="k">ID</span><span class="v">${esc(safe.id || '-')}</span></div>
      <div class="rc-item"><span class="k">Theme</span><span class="v">${esc(safe.theme || '-')}</span></div>
      <div class="rc-item"><span class="k">Age Group</span><span class="v">${esc(safe.ageGroup || '-')}</span></div>
      <div class="rc-item"><span class="k">Language</span><span class="v">${esc(safe.language || '-')}</span></div>
      <div class="rc-item"><span class="k">Style</span><span class="v">${esc(safe.style || '-')}</span></div>
      <div class="rc-item"><span class="k">Page Target</span><span class="v">${esc(String(safe.pageTarget || 0))}</span></div>
      <div class="rc-item"><span class="k">Status</span><span class="v">${esc(safe.status || '-')}</span></div>
    </div>
  `;
}

function renderCards(cards){
  var safe = cards && typeof cards === 'object' ? cards : {};
  var keys = ['review', 'interior', 'cover', 'delivery', 'release'];

  return `
    <div class="rc-card-grid">
      ${keys.map(function(key){
        var card = safe[key] && typeof safe[key] === 'object' ? safe[key] : {};
        var st = statusClass(card.status || 'blocked');
        return `
          <div class="rc-mini-card is-${esc(st)}">
            <div class="rc-mini-label">${esc(card.label || key)}</div>
            <div class="rc-mini-value">${esc(card.value || '-')}</div>
            <div class="rc-mini-status">${esc(st)}</div>
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
    <div class="rc-indicator-list">
      ${list.map(function(item){
        var st = statusClass(item && item.status);
        return `
          <div class="rc-indicator is-${esc(st)}">
            <div class="rc-indicator-top">
              <span class="rc-indicator-label">${esc(item && item.label || item && item.key || '-')}</span>
              <span class="rc-indicator-status">${esc(st)}</span>
            </div>
            <div class="rc-indicator-value">${esc(String(item && item.value != null ? item.value : '-'))}</div>
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

  return '<ul class="rc-list">' + list.map(function(item){
    return '<li>' + esc(item) + '</li>';
  }).join('') + '</ul>';
}

export class ReleaseCenterModule {
  constructor(app){
    this.app = app;
    this.id = 'release_center';
    this.title = 'Release Center';
  }

  async init(){}

  render(root){
    var currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
    var hasPlan = hasUsablePlan(currentPlan);
    var currentPayload = hasPlan ? safeBuildReleaseDashboard(currentPlan) : null;
    var self = this;

    root.innerHTML = `
      <style>
        .rc-wrap{ display:grid; gap:14px; }
        .rc-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .rc-item{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:10px 12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:4px;
        }
        .rc-item .k{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .rc-item .v{
          font-size:14px;
          font-weight:700;
          word-break:break-word;
        }

        .rc-status-hero{
          border:1px solid rgba(255,255,255,.10);
          border-radius:14px;
          padding:14px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:12px;
        }
        .rc-status-hero.is-ready{
          border-color: rgba(90,210,120,.35);
          box-shadow: 0 0 0 1px rgba(90,210,120,.12) inset;
        }
        .rc-status-hero.is-partial{
          border-color: rgba(255,210,90,.35);
          box-shadow: 0 0 0 1px rgba(255,210,90,.12) inset;
        }
        .rc-status-hero.is-blocked{
          border-color: rgba(255,110,110,.35);
          box-shadow: 0 0 0 1px rgba(255,110,110,.12) inset;
        }

        .rc-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .rc-title{
          font-size:14px;
          font-weight:900;
          letter-spacing:.3px;
        }
        .rc-badge{
          font-size:11px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.5px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
        }
        .rc-badge.is-ready{
          background:rgba(90,210,120,.12);
        }
        .rc-badge.is-partial{
          background:rgba(255,210,90,.12);
        }
        .rc-badge.is-blocked{
          background:rgba(255,110,110,.12);
        }

        .rc-headline{
          font-size:18px;
          font-weight:900;
          line-height:1.2;
        }
        .rc-summary{
          font-size:13px;
          line-height:1.45;
          opacity:.92;
        }

        .rc-card-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .rc-mini-card{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:6px;
        }
        .rc-mini-card.is-ready{
          border-color: rgba(90,210,120,.30);
        }
        .rc-mini-card.is-partial{
          border-color: rgba(255,210,90,.30);
        }
        .rc-mini-card.is-blocked{
          border-color: rgba(255,110,110,.30);
        }
        .rc-mini-label{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .rc-mini-value{
          font-size:16px;
          font-weight:900;
          line-height:1.2;
          word-break:break-word;
        }
        .rc-mini-status{
          font-size:11px;
          font-weight:800;
          text-transform:uppercase;
          opacity:.8;
        }

        .rc-indicator-list{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .rc-indicator{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:10px 12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:8px;
        }
        .rc-indicator.is-ready{
          border-color: rgba(90,210,120,.30);
        }
        .rc-indicator.is-partial{
          border-color: rgba(255,210,90,.30);
        }
        .rc-indicator.is-blocked{
          border-color: rgba(255,110,110,.30);
        }
        .rc-indicator-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
        }
        .rc-indicator-label{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .rc-indicator-status{
          font-size:10px;
          font-weight:900;
          text-transform:uppercase;
          opacity:.8;
        }
        .rc-indicator-value{
          font-size:18px;
          font-weight:900;
        }

        .rc-actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:12px;
        }

        .rc-list{
          margin:0;
          padding-left:18px;
          font-size:13px;
          line-height:1.45;
        }

        .rc-empty{
          border:1px dashed rgba(255,255,255,.18);
          border-radius:14px;
          padding:16px;
        }

        .rc-code{
          margin-top:10px;
          white-space:pre-wrap;
          word-break:break-word;
          font-size:12px;
          line-height:1.45;
        }
      </style>

      <div class="rc-wrap">
        <div class="card">
          <h2>Release Center</h2>
          <p class="muted">
            Hub visual final do estado de release do projeto.
            Nesta fase você acompanha a prontidão lógica do pipeline completo antes de futuras etapas de publicação.
          </p>
          <div id="rc_area"></div>
        </div>
      </div>
    `;

    var area = root.querySelector('#rc_area');

    function rebuildAll(){
      currentPlan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
      hasPlan = hasUsablePlan(currentPlan);
      currentPayload = hasPlan ? safeBuildReleaseDashboard(currentPlan) : null;
    }

    function paint(){
      rebuildAll();

      if (!hasPlan) {
        area.innerHTML = `
          <div class="rc-empty">
            <p class="muted"><b>Nenhum coloring project encontrado.</b></p>
            <div class="rc-actions">
              <button class="btn primary" id="rc_reload">Reload Project</button>
            </div>
            <p class="muted">Gere e salve um projeto antes de usar o Release Center.</p>
          </div>
        `;

        var reloadOnlyBtn = area.querySelector('#rc_reload');
        if (reloadOnlyBtn) {
          reloadOnlyBtn.onclick = function(){
            paint();
            if (self.app && self.app.toast) self.app.toast('Project reloaded ✅');
          };
        }
        return;
      }

      var status = statusClass(currentPayload && currentPayload.status);
      var header = currentPayload && currentPayload.header ? currentPayload.header : {};
      var book = currentPayload && currentPayload.book ? currentPayload.book : {};
      var cards = currentPayload && currentPayload.cards ? currentPayload.cards : {};
      var indicators = currentPayload && currentPayload.indicators ? currentPayload.indicators : [];
      var alerts = currentPayload && currentPayload.alerts ? currentPayload.alerts : [];
      var actions = currentPayload && currentPayload.actions ? currentPayload.actions : [];

      area.innerHTML = `
        <div class="card">
          <div class="rc-status-hero is-${esc(status)}">
            <div class="rc-head">
              <div class="rc-title">Release Status</div>
              <div class="rc-badge is-${esc(status)}">${esc(status)}</div>
            </div>
            <div class="rc-headline">${esc(header.headline || '-')}</div>
            <div class="rc-summary">${esc(header.summary || '-')}</div>
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
          <h3>Release Dashboard JSON</h3>
          <pre class="rc-code">${esc(JSON.stringify(currentPayload, null, 2))}</pre>
        </div>

        <div class="rc-actions">
          <button class="btn primary" id="rc_rebuild">Rebuild Release Data</button>
          <button class="btn" id="rc_download">Download Release Dashboard JSON</button>
          <button class="btn secondary" id="rc_reload">Reload Project</button>
        </div>
      `;

      var rebuildBtn = area.querySelector('#rc_rebuild');
      var downloadBtn = area.querySelector('#rc_download');
      var reloadBtn = area.querySelector('#rc_reload');

      if (rebuildBtn) {
        rebuildBtn.onclick = function(){
          try {
            rebuildAll();
            paint();
            if (self.app && self.app.toast) self.app.toast('Release data rebuilt ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to rebuild release data', 'err');
          }
        };
      }

      if (downloadBtn) {
        downloadBtn.onclick = function(){
          try {
            if (!currentPayload) {
              rebuildAll();
            }
            if (!currentPayload) {
              throw new Error('Release dashboard unavailable');
            }

            downloadJson(
              'release-dashboard-' + (currentPlan.id || 'project') + '.json',
              currentPayload
            );

            if (self.app && self.app.toast) self.app.toast('Release dashboard downloaded ✅');
          } catch (e) {
            if (self.app && self.app.toast) self.app.toast('Failed to download release dashboard', 'err');
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
