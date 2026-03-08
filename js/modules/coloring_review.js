/* FILE: /js/modules/coloring_review.js */
// Bright Cub Creator — Coloring Review v0.1 SAFE
// Objetivo:
// - revisão visual/humana do coloring pipeline
// - sem imagem real ainda
// - gate humano antes do PDF
// - sem dependências externas
// - compatível com Safari/iOS

import { Storage } from '../core/storage.js';
import { rebuildGenerationQueues } from '../core/generation_queue.js';

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

function nowIso(){
  try {
    return new Date().toISOString();
  } catch (e) {
    return '';
  }
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

function normalizeScene(input, idx){
  var src = input && typeof input === 'object' ? input : {};
  var review = src.review && typeof src.review === 'object' ? src.review : {};

  return {
    index: idx + 1,
    id: normalizeText(src.id),
    title: normalizeText(src.title) || ('Scene ' + (idx + 1)),
    promptBase: normalizeText(src.promptBase),
    status: normalizeText(src.status || 'pending') || 'pending',
    tags: Array.isArray(src.tags) ? src.tags.filter(Boolean).map(function(x){ return String(x).trim(); }) : [],
    attempts: Math.max(0, toInt(src.attempts, 0)),
    processingAt: normalizeText(src.processingAt || ''),
    approvedAt: normalizeText(src.approvedAt || ''),
    rejectedAt: normalizeText(src.rejectedAt || ''),
    rejectionReason: normalizeText(src.rejectionReason || ''),
    output: src.output != null ? src.output : null,
    review: {
      status: normalizeReviewStatus(review.status),
      reviewedAt: normalizeText(review.reviewedAt || ''),
      note: normalizeText(review.note || '')
    }
  };
}

function normalizePlan(input){
  var src = input && typeof input === 'object' ? clone(input) : {};
  var scenes = Array.isArray(src.scenes) ? src.scenes.map(normalizeScene) : [];

  var plan = {
    id: normalizeText(src.id),
    createdAt: normalizeText(src.createdAt),
    updatedAt: normalizeText(src.updatedAt),
    theme: normalizeText(src.theme),
    ageGroup: normalizeText(src.ageGroup),
    pageTarget: Math.max(0, toInt(src.pageTarget, 0)),
    language: normalizeText(src.language || 'en') || 'en',
    style: normalizeText(src.style || 'clean coloring page') || 'clean coloring page',
    status: normalizeText(src.status || 'idle') || 'idle',
    scenes: scenes,
    pending: Array.isArray(src.pending) ? src.pending.slice() : [],
    approved: Array.isArray(src.approved) ? src.approved.slice() : [],
    rejected: Array.isArray(src.rejected) ? src.rejected.slice() : [],
    notes: normalizeText(src.notes)
  };

  return rebuildGenerationQueues(plan);
}

function shorten(text, max){
  var s = normalizeText(text);
  var limit = Number(max || 120);
  if (!s) return '';
  if (s.length <= limit) return s;
  return s.slice(0, Math.max(0, limit - 1)).trimEnd() + '…';
}

function sceneStatusLabel(status){
  var s = normalizeText(status).toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  if (s === 'processing') return 'processing';
  return 'pending';
}

function reviewLabel(status){
  var s = normalizeReviewStatus(status);
  if (s === 'approved_for_book') return 'approved_for_book';
  if (s === 'rejected') return 'rejected';
  if (s === 'needs_redo') return 'needs_redo';
  return 'pending_review';
}

function renderReviewSummary(plan){
  var scenes = Array.isArray(plan && plan.scenes) ? plan.scenes : [];
  var reviewPending = 0;
  var reviewApproved = 0;
  var reviewRejected = 0;
  var reviewRedo = 0;
  var i;
  var s;
  var rs;

  for (i = 0; i < scenes.length; i += 1){
    s = scenes[i];
    rs = reviewLabel(s && s.review && s.review.status);

    if (rs === 'approved_for_book') reviewApproved += 1;
    else if (rs === 'rejected') reviewRejected += 1;
    else if (rs === 'needs_redo') reviewRedo += 1;
    else reviewPending += 1;
  }

  return `
    <div class="crv-meta-grid">
      <div class="crv-meta-item"><span class="k">Theme</span><span class="v">${esc(plan.theme || '-')}</span></div>
      <div class="crv-meta-item"><span class="k">Age Group</span><span class="v">${esc(plan.ageGroup || '-')}</span></div>
      <div class="crv-meta-item"><span class="k">Scenes</span><span class="v">${esc(String(scenes.length))}</span></div>
      <div class="crv-meta-item"><span class="k">Pending Review</span><span class="v">${esc(String(reviewPending))}</span></div>
      <div class="crv-meta-item"><span class="k">Approved for Book</span><span class="v">${esc(String(reviewApproved))}</span></div>
      <div class="crv-meta-item"><span class="k">Rejected</span><span class="v">${esc(String(reviewRejected))}</span></div>
      <div class="crv-meta-item"><span class="k">Needs Redo</span><span class="v">${esc(String(reviewRedo))}</span></div>
      <div class="crv-meta-item"><span class="k">Queue Status</span><span class="v">${esc(plan.status || '-')}</span></div>
    </div>
  `;
}

function renderSceneCard(scene){
  var tags = Array.isArray(scene.tags) && scene.tags.length
    ? scene.tags.map(function(tag){
        return '<span class="crv-tag">' + esc(tag) + '</span>';
      }).join('')
    : '<span class="crv-tag muted">no tags</span>';

  var queueState = sceneStatusLabel(scene.status);
  var reviewState = reviewLabel(scene.review && scene.review.status);

  return `
    <div class="crv-card is-${esc(reviewState)}">
      <div class="crv-card-head">
        <div class="crv-card-no">#${esc(String(scene.index))}</div>
        <div class="crv-card-title">${esc(scene.title)}</div>
        <div class="crv-badges">
          <span class="crv-badge queue-${esc(queueState)}">${esc(scene.status)}</span>
          <span class="crv-badge review-${esc(reviewState)}">${esc(reviewState)}</span>
        </div>
      </div>

      <div class="crv-placeholder">
        <div class="crv-placeholder-label">VISUAL REVIEW PLACEHOLDER</div>
        <div class="crv-placeholder-note">Future generated image preview</div>
      </div>

      <div class="crv-tags">${tags}</div>

      <div class="crv-meta-line">
        <span><b>Attempts:</b> ${esc(String(scene.attempts || 0))}</span>
        ${scene.review && scene.review.reviewedAt ? '<span><b>Reviewed:</b> ' + esc(scene.review.reviewedAt) + '</span>' : ''}
      </div>

      <div class="crv-prompt">
        <span class="k">Prompt:</span>
        <span class="v">${esc(shorten(scene.promptBase, 150) || '-')}</span>
      </div>

      ${scene.review && scene.review.note ? `
        <div class="crv-prompt">
          <span class="k">Review Note:</span>
          <span class="v">${esc(scene.review.note)}</span>
        </div>
      ` : ''}

      <div class="crv-actions" data-scene-id="${esc(scene.id)}">
        <button class="btn" data-review-action="approve">Approve for Book</button>
        <button class="btn" data-review-action="reject">Reject</button>
        <button class="btn secondary" data-review-action="redo">Needs Redo</button>
      </div>
    </div>
  `;
}

function renderPage(scene){
  var queueState = sceneStatusLabel(scene.status);
  var reviewState = reviewLabel(scene.review && scene.review.status);

  return `
    <div class="crv-paper is-${esc(reviewState)}">
      <div class="crv-paper-inner">
        <div class="crv-page-head">
          <div>
            <div class="crv-page-label">COLORING REVIEW</div>
            <div class="crv-page-title">${esc(scene.title)}</div>
          </div>
          <div class="crv-page-no">p.${esc(String(scene.index))}</div>
        </div>

        <div class="crv-page-badges">
          <span class="crv-badge queue-${esc(queueState)}">${esc(scene.status)}</span>
          <span class="crv-badge review-${esc(reviewState)}">${esc(reviewState)}</span>
        </div>

        <div class="crv-page-placeholder">
          <div class="crv-placeholder-label">VISUAL REVIEW PLACEHOLDER</div>
          <div class="crv-placeholder-note">Future generated image preview</div>
        </div>

        <div class="crv-page-footer">
          <div class="crv-meta-line">
            <span><b>Attempts:</b> ${esc(String(scene.attempts || 0))}</span>
            ${scene.review && scene.review.reviewedAt ? '<span><b>Reviewed:</b> ' + esc(scene.review.reviewedAt) + '</span>' : ''}
          </div>

          <div class="crv-tags">
            ${(scene.tags || []).length
              ? scene.tags.map(function(tag){
                  return '<span class="crv-tag">' + esc(tag) + '</span>';
                }).join('')
              : '<span class="crv-tag muted">no tags</span>'
            }
          </div>

          <div class="crv-prompt">
            <span class="k">Prompt:</span>
            <span class="v">${esc(shorten(scene.promptBase, 120) || '-')}</span>
          </div>

          ${scene.review && scene.review.note ? `
            <div class="crv-prompt">
              <span class="k">Review Note:</span>
              <span class="v">${esc(scene.review.note)}</span>
            </div>
          ` : ''}

          <div class="crv-actions" data-scene-id="${esc(scene.id)}">
            <button class="btn" data-review-action="approve">Approve for Book</button>
            <button class="btn" data-review-action="reject">Reject</button>
            <button class="btn secondary" data-review-action="redo">Needs Redo</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function applyReviewToPlan(plan, sceneId, action){
  var next = normalizePlan(plan || {});
  var scenes = Array.isArray(next.scenes) ? next.scenes : [];
  var id = normalizeText(sceneId);
  var i;
  var scene;
  var status = 'pending_review';

  if (action === 'approve') status = 'approved_for_book';
  else if (action === 'reject') status = 'rejected';
  else if (action === 'redo') status = 'needs_redo';

  for (i = 0; i < scenes.length; i += 1){
    scene = scenes[i];
    if (normalizeText(scene.id) !== id) continue;

    scene.review = scene.review || {};
    scene.review.status = status;
    scene.review.reviewedAt = nowIso();

    if (status === 'approved_for_book') {
      scene.review.note = 'Approved for book';
    } else if (status === 'rejected') {
      scene.review.note = 'Rejected in human review';
    } else if (status === 'needs_redo') {
      scene.review.note = 'Needs redo before book';
    } else {
      scene.review.note = '';
    }

    break;
  }

  next.updatedAt = nowIso();
  return next;
}

export class ColoringReviewModule {
  constructor(app){
    this.app = app;
    this.id = 'coloring_review';
    this.title = 'Coloring Review';
  }

  async init(){}

  render(root){
    var seed = Storage.get('coloring:review_seed', {
      mode: 'FOLHEAR',
      pageIndex: 0
    });

    var plan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
    var hasPlan = !!(plan && plan.theme && Array.isArray(plan.scenes) && plan.scenes.length);

    function saveSeed(next){
      Storage.set('coloring:review_seed', next || {
        mode: 'FOLHEAR',
        pageIndex: 0
      });
    }

    function persistPlan(nextPlan){
      Storage.set('coloring:book_plan', nextPlan);
    }

    root.innerHTML = `
      <style>
        .crv-wrap{ display:grid; gap:14px; }
        .crv-toolbar{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
          justify-content:space-between;
          margin-bottom:10px;
        }
        .crv-left,.crv-right{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
        }
        .crv-mini{ font-size:12px; opacity:.8; }

        .crv-meta-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .crv-meta-item{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:10px 12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:4px;
        }
        .crv-meta-item .k{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .crv-meta-item .v{
          font-size:14px;
          font-weight:700;
          word-break:break-word;
        }

        .crv-empty{
          border:1px dashed rgba(255,255,255,.18);
          border-radius:14px;
          padding:16px;
        }

        .crv-list{
          display:grid;
          gap:12px;
          margin-top:14px;
        }

        .crv-card{
          border:1px solid rgba(255,255,255,.08);
          border-radius:14px;
          padding:12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:10px;
        }
        .crv-card.is-approved_for_book{
          border-color: rgba(90, 210, 120, .42);
          box-shadow: 0 0 0 1px rgba(90, 210, 120, .14) inset;
        }
        .crv-card.is-rejected{
          border-color: rgba(255, 110, 110, .42);
          box-shadow: 0 0 0 1px rgba(255, 110, 110, .14) inset;
        }
        .crv-card.is-needs_redo{
          border-color: rgba(255, 210, 90, .42);
          box-shadow: 0 0 0 1px rgba(255, 210, 90, .14) inset;
        }

        .crv-card-head{
          display:grid;
          grid-template-columns:auto 1fr auto;
          gap:10px;
          align-items:center;
        }
        .crv-card-no{
          font-size:12px;
          font-weight:900;
          opacity:.8;
        }
        .crv-card-title{
          font-size:15px;
          font-weight:800;
          line-height:1.2;
        }

        .crv-badges,
        .crv-page-badges{
          display:flex;
          gap:6px;
          flex-wrap:wrap;
          align-items:center;
        }
        .crv-badge{
          font-size:11px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.4px;
          padding:5px 8px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
        }
        .crv-badge.queue-pending{ opacity:.85; }
        .crv-badge.queue-processing{ opacity:1; }
        .crv-badge.queue-approved{ opacity:1; }
        .crv-badge.queue-rejected{ opacity:.8; }

        .crv-badge.review-pending_review{ opacity:.8; }
        .crv-badge.review-approved_for_book{ background:rgba(90,210,120,.12); }
        .crv-badge.review-rejected{ background:rgba(255,110,110,.12); }
        .crv-badge.review-needs_redo{ background:rgba(255,210,90,.12); }

        .crv-placeholder,
        .crv-page-placeholder{
          border:2px dashed rgba(255,255,255,.14);
          min-height:180px;
          display:flex;
          align-items:center;
          justify-content:center;
          text-align:center;
          border-radius:12px;
          padding:18px;
          background:rgba(255,255,255,.02);
        }
        .crv-placeholder-label{
          font-size:16px;
          font-weight:900;
          letter-spacing:.7px;
        }
        .crv-placeholder-note{
          margin-top:6px;
          font-size:12px;
          opacity:.72;
        }

        .crv-tags{
          display:flex;
          gap:6px;
          flex-wrap:wrap;
        }
        .crv-tag{
          font-size:11px;
          padding:5px 8px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.10);
          background:rgba(255,255,255,.03);
        }
        .crv-tag.muted{ opacity:.65; }

        .crv-meta-line{
          display:flex;
          flex-wrap:wrap;
          gap:12px;
          font-size:12px;
          opacity:.82;
        }

        .crv-prompt{
          display:grid;
          gap:4px;
        }
        .crv-prompt .k{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .crv-prompt .v{
          font-size:13px;
          line-height:1.35;
          word-break:break-word;
        }

        .crv-actions{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:4px;
        }

        .crv-paper-wrap{
          display:flex;
          justify-content:center;
          margin-top:14px;
        }
        .crv-paper{
          width:min(100%, 560px);
          aspect-ratio:8.5 / 11;
          background:#fff;
          color:#111;
          border:1px solid rgba(0,0,0,.8);
          box-shadow:0 10px 28px rgba(0,0,0,.22);
        }
        .crv-paper.is-approved_for_book{
          box-shadow:0 10px 28px rgba(0,0,0,.22), 0 0 0 2px rgba(90,210,120,.24);
        }
        .crv-paper.is-rejected{
          box-shadow:0 10px 28px rgba(0,0,0,.22), 0 0 0 2px rgba(255,110,110,.24);
        }
        .crv-paper.is-needs_redo{
          box-shadow:0 10px 28px rgba(0,0,0,.22), 0 0 0 2px rgba(255,210,90,.24);
        }

        .crv-paper-inner{
          height:100%;
          display:grid;
          grid-template-rows:auto auto 1fr auto;
          gap:14px;
          padding:18px;
          overflow:hidden;
        }
        .crv-page-head{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
        }
        .crv-page-label{
          font-size:12px;
          font-weight:800;
          letter-spacing:.5px;
          text-transform:uppercase;
          opacity:.72;
        }
        .crv-page-title{
          margin-top:6px;
          font-size:24px;
          line-height:1.08;
          font-weight:900;
        }
        .crv-page-no{
          font-size:14px;
          font-weight:800;
          opacity:.72;
          padding-top:4px;
          white-space:nowrap;
        }

        @media (max-width: 640px){
          .crv-paper-inner{ padding:14px; gap:12px; }
          .crv-page-title{ font-size:20px; }
          .crv-card-head{ grid-template-columns:auto 1fr; }
          .crv-badges{ grid-column:1 / -1; }
          .crv-actions{ flex-direction:column; }
        }
      </style>

      <div class="crv-wrap">
        <div class="card">
          <h2>Coloring Review</h2>
          <p class="muted">
            Revisão visual/humana antes do PDF. Nesta fase ainda usamos placeholder,
            mas a etapa já funciona como gate editorial de aprovação.
          </p>
          <div id="crv_area"></div>
        </div>
      </div>
    `;

    var area = root.querySelector('#crv_area');

    function bindReviewActions(scope, repaint){
      var buttons = scope.querySelectorAll('[data-review-action]');
      buttons.forEach(function(btn){
        btn.onclick = function(){
          var action = btn.getAttribute('data-review-action') || '';
          var actionsBox = btn.closest('[data-scene-id]');
          var sceneId = actionsBox ? actionsBox.getAttribute('data-scene-id') : '';

          if (!sceneId) return;

          plan = applyReviewToPlan(plan, sceneId, action);
          persistPlan(plan);

          if (this.app && this.app.toast) {
            if (action === 'approve') this.app.toast('Approved for book ✅');
            else if (action === 'reject') this.app.toast('Scene rejected ✅');
            else if (action === 'redo') this.app.toast('Marked as needs redo ✅');
          }

          repaint();
        }.bind(this);
      }, this);
    }

    var renderEmpty = () => {
      area.innerHTML = `
        <div class="crv-empty">
          <p class="muted"><b>Nenhum plano de coloring book encontrado.</b></p>
          <div class="row">
            <button class="btn primary" id="crv_go_agent">Abrir Coloring Agent</button>
          </div>
          <p class="crv-mini muted">Gere e salve um plano antes de revisar.</p>
        </div>
      `;

      var btn = area.querySelector('#crv_go_agent');
      if (btn) {
        btn.onclick = function(){
          var nav = document.querySelector('.navitem[data-view="coloring_agent"]');
          if (nav && nav.click) nav.click();
        };
      }
    };

    var renderMain = () => {
      plan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
      if (!(plan && plan.theme && plan.scenes && plan.scenes.length)) {
        renderEmpty();
        return;
      }

      var mode = seed.mode === 'LISTA' ? 'LISTA' : 'FOLHEAR';
      var pageIndex = Math.max(0, Math.min(seed.pageIndex || 0, plan.scenes.length - 1));

      function save(){
        saveSeed({
          mode: mode,
          pageIndex: pageIndex
        });
      }

      function paint(){
        var current = plan.scenes[pageIndex];
        var reviewState = reviewLabel(current && current.review && current.review.status);

        if (mode === 'LISTA') {
          area.innerHTML = `
            <div class="crv-toolbar">
              <div class="crv-left">
                <span class="crv-mini"><b>${esc(plan.theme || 'COLORING REVIEW')}</b></span>
                <span class="crv-mini">• age <b>${esc(plan.ageGroup || '-')}</b></span>
                <span class="crv-mini">• scenes <b>${esc(String(plan.scenes.length))}</b></span>
              </div>

              <div class="crv-right">
                <button class="btn primary" id="crv_mode_folhear">Folhear</button>
                <button class="btn" id="crv_mode_lista">Lista</button>
              </div>
            </div>

            ${renderReviewSummary(plan)}

            <div class="crv-list">
              ${plan.scenes.map(renderSceneCard).join('')}
            </div>
          `;

          var folhearBtnList = area.querySelector('#crv_mode_folhear');
          if (folhearBtnList) {
            folhearBtnList.onclick = function(){
              mode = 'FOLHEAR';
              save();
              paint();
            };
          }

          bindReviewActions(area, paint);
          return;
        }

        area.innerHTML = `
          <div class="crv-toolbar">
            <div class="crv-left">
              <span class="crv-mini"><b>${esc(plan.theme || 'COLORING REVIEW')}</b></span>
              <span class="crv-mini">• age <b>${esc(plan.ageGroup || '-')}</b></span>
              <span class="crv-mini">• scene <b>${esc(String(pageIndex + 1))}/${esc(String(plan.scenes.length))}</b></span>
              <span class="crv-mini">• review <b>${esc(reviewState)}</b></span>
            </div>

            <div class="crv-right">
              <button class="btn" id="crv_prev">◀</button>
              <button class="btn" id="crv_next">▶</button>
              <button class="btn" id="crv_mode_lista">Lista</button>
              <button class="btn primary" id="crv_mode_folhear">Folhear</button>
            </div>
          </div>

          ${renderReviewSummary(plan)}

          <div class="crv-paper-wrap">
            ${renderPage(current)}
          </div>
        `;

        var prevBtn = area.querySelector('#crv_prev');
        var nextBtn = area.querySelector('#crv_next');
        var listBtn = area.querySelector('#crv_mode_lista');

        if (prevBtn) {
          prevBtn.onclick = function(){
            pageIndex = Math.max(0, pageIndex - 1);
            save();
            paint();
          };
        }

        if (nextBtn) {
          nextBtn.onclick = function(){
            pageIndex = Math.min(plan.scenes.length - 1, pageIndex + 1);
            save();
            paint();
          };
        }

        if (listBtn) {
          listBtn.onclick = function(){
            mode = 'LISTA';
            save();
            paint();
          };
        }

        bindReviewActions(area, paint);
      }

      paint();
    };

    if (!hasPlan) {
      renderEmpty();
      return;
    }

    renderMain();
  }
}
