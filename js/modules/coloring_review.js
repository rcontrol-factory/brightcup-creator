/* FILE: /js/modules/coloring_review.js */
// Bright Cup Creator — Coloring Review v0.3 SAFE
// Gate humano obrigatório antes do Export Center
// - revisão visual/humana do coloring pipeline
// - sem imagem real ainda
// - placeholder visual
// - integra preflight gate
// - compatível com Safari/iOS
// - sem dependências externas

import { Storage } from '../core/storage.js';
import { rebuildGenerationQueues } from '../core/generation_queue.js';
import { evaluateColoringPreflight } from '../core/preflight_gate.js';

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

function normalizeQueueStatus(status){
  var s = normalizeText(status).toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  if (s === 'processing') return 'processing';
  return 'pending';
}

function normalizeScene(input, idx){
  var src = input && typeof input === 'object' ? input : {};
  var review = src.review && typeof src.review === 'object' ? src.review : {};

  return {
    index: idx + 1,
    id: normalizeText(src.id),
    title: normalizeText(src.title) || ('Scene ' + (idx + 1)),
    promptBase: normalizeText(src.promptBase),
    status: normalizeQueueStatus(src.status || 'pending'),
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

function reviewLabel(status){
  return normalizeReviewStatus(status);
}

function queueLabel(status){
  return normalizeQueueStatus(status);
}

function getReviewCounts(plan){
  var scenes = Array.isArray(plan && plan.scenes) ? plan.scenes : [];
  var counts = {
    pending_review: 0,
    approved_for_book: 0,
    rejected: 0,
    needs_redo: 0
  };
  var i;
  var state;

  for (i = 0; i < scenes.length; i += 1){
    state = reviewLabel(scenes[i] && scenes[i].review && scenes[i].review.status);
    counts[state] = (counts[state] || 0) + 1;
  }

  return counts;
}

function renderReviewSummary(plan){
  var scenes = Array.isArray(plan && plan.scenes) ? plan.scenes : [];
  var counts = getReviewCounts(plan);

  return `
    <div class="crv-meta-grid">
      <div class="crv-meta-item"><span class="k">Theme</span><span class="v">${esc(plan.theme || '-')}</span></div>
      <div class="crv-meta-item"><span class="k">Age Group</span><span class="v">${esc(plan.ageGroup || '-')}</span></div>
      <div class="crv-meta-item"><span class="k">Scenes</span><span class="v">${esc(String(scenes.length))}</span></div>
      <div class="crv-meta-item"><span class="k">Pending Review</span><span class="v">${esc(String(counts.pending_review || 0))}</span></div>
      <div class="crv-meta-item"><span class="k">Approved for Book</span><span class="v">${esc(String(counts.approved_for_book || 0))}</span></div>
      <div class="crv-meta-item"><span class="k">Rejected</span><span class="v">${esc(String(counts.rejected || 0))}</span></div>
      <div class="crv-meta-item"><span class="k">Needs Redo</span><span class="v">${esc(String(counts.needs_redo || 0))}</span></div>
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

  var queueState = queueLabel(scene.status);
  var reviewState = reviewLabel(scene.review && scene.review.status);

  return `
    <div class="crv-card is-${esc(reviewState)}">
      <div class="crv-card-head">
        <div class="crv-card-no">#${esc(String(scene.index))}</div>
        <div class="crv-card-title-wrap">
          <div class="crv-card-title">${esc(scene.title)}</div>
          <div class="crv-card-sub muted">Human review gate before export</div>
        </div>
        <div class="crv-badges">
          <span class="crv-badge queue-${esc(queueState)}">${esc(queueState)}</span>
          <span class="crv-badge review-${esc(reviewState)}">${esc(reviewState)}</span>
        </div>
      </div>

      <div class="crv-placeholder is-${esc(reviewState)}">
        <div>
          <div class="crv-placeholder-label">VISUAL REVIEW PLACEHOLDER</div>
          <div class="crv-placeholder-note">Future generated image preview</div>
        </div>
      </div>

      <div class="crv-tags">${tags}</div>

      <div class="crv-meta-line">
        <span><b>Attempts:</b> ${esc(String(scene.attempts || 0))}</span>
        <span><b>Queue:</b> ${esc(queueState)}</span>
        ${scene.review && scene.review.reviewedAt ? '<span><b>Reviewed:</b> ' + esc(scene.review.reviewedAt) + '</span>' : ''}
      </div>

      <div class="crv-prompt">
        <span class="k">Prompt Summary</span>
        <span class="v">${esc(shorten(scene.promptBase, 180) || '-')}</span>
      </div>

      <div class="crv-prompt">
        <span class="k">Review Note</span>
        <span class="v">${esc(scene.review && scene.review.note ? scene.review.note : 'No review note yet.')}</span>
      </div>

      <div class="crv-actions" data-scene-id="${esc(scene.id)}">
        <button class="btn" data-review-action="approve">Approve for Book</button>
        <button class="btn" data-review-action="reject">Reject</button>
        <button class="btn secondary" data-review-action="redo">Needs Redo</button>
      </div>
    </div>
  `;
}

function renderPage(scene){
  var queueState = queueLabel(scene.status);
  var reviewState = reviewLabel(scene.review && scene.review.status);

  return `
    <div class="crv-paper is-${esc(reviewState)}">
      <div class="crv-paper-inner">
        <div class="crv-page-head">
          <div>
            <div class="crv-page-label">COLORING REVIEW GATE</div>
            <div class="crv-page-title">${esc(scene.title)}</div>
            <div class="crv-page-sub muted">Approve only when this scene is editorially ready for export.</div>
          </div>
          <div class="crv-page-no">p.${esc(String(scene.index))}</div>
        </div>

        <div class="crv-page-badges">
          <span class="crv-badge queue-${esc(queueState)}">${esc(queueState)}</span>
          <span class="crv-badge review-${esc(reviewState)}">${esc(reviewState)}</span>
        </div>

        <div class="crv-page-placeholder is-${esc(reviewState)}">
          <div>
            <div class="crv-placeholder-label">VISUAL REVIEW PLACEHOLDER</div>
            <div class="crv-placeholder-note">Future generated image preview</div>
          </div>
        </div>

        <div class="crv-page-footer">
          <div class="crv-meta-line">
            <span><b>Attempts:</b> ${esc(String(scene.attempts || 0))}</span>
            <span><b>Queue:</b> ${esc(queueState)}</span>
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
            <span class="k">Prompt Summary</span>
            <span class="v">${esc(shorten(scene.promptBase, 140) || '-')}</span>
          </div>

          <div class="crv-prompt">
            <span class="k">Review Note</span>
            <span class="v">${esc(scene.review && scene.review.note ? scene.review.note : 'No review note yet.')}</span>
          </div>

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

function renderPreflightReport(result){
  if (!result) return '<p class="muted">No preflight yet.</p>';

  var issues = Array.isArray(result.issues) ? result.issues : [];
  var warnings = Array.isArray(result.warnings) ? result.warnings : [];
  var stats = result.stats || {};

  return `
    <div class="crv-preflight-box ${result.canProceed ? 'is-pass' : 'is-block'}">
      <div class="crv-preflight-head">
        <div class="crv-preflight-title">Preflight Status</div>
        <div class="crv-preflight-badge ${result.canProceed ? 'is-pass' : 'is-block'}">
          ${result.canProceed ? 'READY TO PROCEED' : 'NOT READY'}
        </div>
      </div>

      <div class="crv-preflight-summary">${esc(result.summary || '')}</div>

      <div class="crv-preflight-note">
        Human review is the required gate before export. Resolve pending review and redo items before moving forward.
      </div>

      <div class="crv-preflight-stats">
        <div><b>canProceed:</b> ${esc(String(!!result.canProceed))}</div>
        <div><b>totalScenes:</b> ${esc(String(stats.totalScenes || 0))}</div>
        <div><b>approvedForBook:</b> ${esc(String(stats.approvedForBook || 0))}</div>
        <div><b>rejected:</b> ${esc(String(stats.rejected || 0))}</div>
        <div><b>needsRedo:</b> ${esc(String(stats.needsRedo || 0))}</div>
        <div><b>pendingReview:</b> ${esc(String(stats.pendingReview || 0))}</div>
        <div><b>pageTarget:</b> ${esc(String(stats.pageTarget || 0))}</div>
      </div>

      <div class="crv-preflight-list-wrap">
        <div class="crv-preflight-col">
          <div class="crv-preflight-subtitle">Issues</div>
          ${
            issues.length
              ? '<ul class="crv-preflight-list">' + issues.map(function(item){ return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>'
              : '<p class="muted">No issues.</p>'
          }
        </div>

        <div class="crv-preflight-col">
          <div class="crv-preflight-subtitle">Warnings</div>
          ${
            warnings.length
              ? '<ul class="crv-preflight-list">' + warnings.map(function(item){ return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>'
              : '<p class="muted">No warnings.</p>'
          }
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
  var note = '';

  if (action === 'approve') {
    status = 'approved_for_book';
    note = 'Approved for book';
  } else if (action === 'reject') {
    status = 'rejected';
    note = 'Rejected in human review';
  } else if (action === 'redo') {
    status = 'needs_redo';
    note = 'Needs redo before export';
  }

  for (i = 0; i < scenes.length; i += 1){
    scene = scenes[i];
    if (normalizeText(scene.id) !== id) continue;

    scene.review = scene.review || {};
    scene.review.status = status;
    scene.review.reviewedAt = nowIso();
    scene.review.note = note;
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
    var preflight = hasPlan ? evaluateColoringPreflight(plan) : null;
    var self = this;

    function saveSeed(next){
      Storage.set('coloring:review_seed', next || {
        mode: 'FOLHEAR',
        pageIndex: 0
      });
    }

    function persistPlan(nextPlan){
      Storage.set('coloring:book_plan', nextPlan);
    }

    function refreshPreflight(){
      preflight = plan && plan.scenes && plan.scenes.length ? evaluateColoringPreflight(plan) : null;
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
        .crv-card.is-pending_review{
          border-color: rgba(90, 170, 255, .35);
          box-shadow: 0 0 0 1px rgba(90, 170, 255, .10) inset;
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
        .crv-card-title-wrap{
          min-width:0;
          display:grid;
          gap:4px;
        }
        .crv-card-title{
          font-size:15px;
          font-weight:800;
          line-height:1.2;
        }
        .crv-card-sub{
          font-size:12px;
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
        .crv-badge.queue-pending{ background: rgba(90,170,255,.10); }
        .crv-badge.queue-processing{ background: rgba(255,210,90,.12); }
        .crv-badge.queue-approved{ background: rgba(90,210,120,.12); }
        .crv-badge.queue-rejected{ background: rgba(255,110,110,.12); }

        .crv-badge.review-pending_review{ background: rgba(90,170,255,.10); }
        .crv-badge.review-approved_for_book{ background: rgba(90,210,120,.12); }
        .crv-badge.review-rejected{ background: rgba(255,110,110,.12); }
        .crv-badge.review-needs_redo{ background: rgba(255,210,90,.12); }

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
        .crv-placeholder.is-pending_review,
        .crv-page-placeholder.is-pending_review{
          border-color: rgba(90,170,255,.32);
        }
        .crv-placeholder.is-approved_for_book,
        .crv-page-placeholder.is-approved_for_book{
          border-color: rgba(90,210,120,.34);
        }
        .crv-placeholder.is-rejected,
        .crv-page-placeholder.is-rejected{
          border-color: rgba(255,110,110,.34);
        }
        .crv-placeholder.is-needs_redo,
        .crv-page-placeholder.is-needs_redo{
          border-color: rgba(255,210,90,.34);
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
        .crv-paper.is-pending_review{
          box-shadow:0 10px 28px rgba(0,0,0,.22), 0 0 0 2px rgba(90,170,255,.24);
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
        .crv-page-sub{
          margin-top:6px;
          font-size:12px;
          line-height:1.3;
        }
        .crv-page-no{
          font-size:14px;
          font-weight:800;
          opacity:.72;
          padding-top:4px;
          white-space:nowrap;
        }

        .crv-preflight-box{
          margin-top:14px;
          border:1px solid rgba(255,255,255,.10);
          border-radius:14px;
          padding:14px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:12px;
        }
        .crv-preflight-box.is-pass{
          border-color: rgba(90,210,120,.35);
          box-shadow: 0 0 0 1px rgba(90,210,120,.12) inset;
        }
        .crv-preflight-box.is-block{
          border-color: rgba(255,110,110,.35);
          box-shadow: 0 0 0 1px rgba(255,110,110,.12) inset;
        }
        .crv-preflight-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .crv-preflight-title{
          font-size:14px;
          font-weight:900;
          letter-spacing:.3px;
        }
        .crv-preflight-badge{
          font-size:11px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.5px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
        }
        .crv-preflight-badge.is-pass{
          background: rgba(90,210,120,.12);
        }
        .crv-preflight-badge.is-block{
          background: rgba(255,110,110,.12);
        }
        .crv-preflight-summary{
          font-size:13px;
          line-height:1.4;
          opacity:.92;
        }
        .crv-preflight-note{
          font-size:12px;
          line-height:1.35;
          opacity:.82;
        }
        .crv-preflight-stats{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap:8px 12px;
          font-size:12px;
          opacity:.9;
        }
        .crv-preflight-list-wrap{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:14px;
        }
        .crv-preflight-col{
          min-width:0;
        }
        .crv-preflight-subtitle{
          font-size:12px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.8;
          margin-bottom:6px;
        }
        .crv-preflight-list{
          margin:0;
          padding-left:18px;
          font-size:13px;
          line-height:1.4;
        }

        @media (max-width: 640px){
          .crv-paper-inner{ padding:14px; gap:12px; }
          .crv-page-title{ font-size:20px; }
          .crv-card-head{ grid-template-columns:auto 1fr; }
          .crv-badges{ grid-column:1 / -1; }
          .crv-actions{ flex-direction:column; }
          .crv-preflight-list-wrap{ grid-template-columns: 1fr; }
        }
      </style>

      <div class="crv-wrap">
        <div class="card">
          <h2>Coloring Review</h2>
          <p class="muted">
            Revisão visual/humana obrigatória antes da exportação. Mesmo sem imagem real ainda, esta tela já funciona como gate editorial antes do Export Center.
          </p>
          <div id="crv_area"></div>
        </div>
      </div>
    `;

    var area = root.querySelector('#crv_area');

    function bindReviewActions(scope, repaint){
      var buttons = scope.querySelectorAll('[data-review-action]');
      Array.prototype.forEach.call(buttons, function(btn){
        btn.onclick = function(){
          var action = btn.getAttribute('data-review-action') || '';
          var actionsBox = btn.closest('[data-scene-id]');
          var sceneId = actionsBox ? actionsBox.getAttribute('data-scene-id') : '';

          if (!sceneId) return;

          plan = applyReviewToPlan(plan, sceneId, action);
          persistPlan(plan);
          refreshPreflight();

          if (self.app && self.app.toast) {
            if (action === 'approve') self.app.toast('Approved for book ✅');
            else if (action === 'reject') self.app.toast('Scene rejected ✅');
            else if (action === 'redo') self.app.toast('Marked as needs redo ✅');
          }

          repaint();
        };
      });
    }

    var renderEmpty = function(){
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

    var renderMain = function(){
      plan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
      if (!(plan && plan.theme && plan.scenes && plan.scenes.length)) {
        renderEmpty();
        return;
      }

      refreshPreflight();

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
                <span class="crv-mini">• gate <b>human review</b></span>
              </div>

              <div class="crv-right">
                <button class="btn primary" id="crv_mode_folhear">Folhear</button>
                <button class="btn" id="crv_mode_lista">Lista</button>
              </div>
            </div>

            ${renderReviewSummary(plan)}
            ${renderPreflightReport(preflight)}

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
          ${renderPreflightReport(preflight)}

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

    function refreshPreflight(){
      preflight = plan && plan.scenes && plan.scenes.length ? evaluateColoringPreflight(plan) : null;
    }

    function persistPlan(nextPlan){
      Storage.set('coloring:book_plan', nextPlan);
    }

    if (!hasPlan) {
      renderEmpty();
      return;
    }

    renderMain();
  }
}
