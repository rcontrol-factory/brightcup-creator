/* FILE: /js/modules/coloring_book_builder.js */
// Bright Cub Creator — Coloring Book Builder v0.1 SAFE
// Objetivo:
// - visualizar o plano salvo pelo Coloring Agent
// - preview estrutural/editorial do coloring book
// - sem imagem real ainda
// - sem dependências externas
// - compatível com Safari/iOS

import { Storage } from '../core/storage.js';

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

function normalizeScene(input, idx){
  var src = input && typeof input === 'object' ? input : {};
  return {
    index: idx + 1,
    id: normalizeText(src.id),
    title: normalizeText(src.title) || ('Scene ' + (idx + 1)),
    promptBase: normalizeText(src.promptBase),
    status: normalizeText(src.status || 'pending') || 'pending',
    tags: Array.isArray(src.tags) ? src.tags.filter(Boolean).map(function(x){ return String(x).trim(); }) : [],
    attempts: Math.max(0, toInt(src.attempts, 0))
  };
}

function normalizePlan(input){
  var src = input && typeof input === 'object' ? input : {};
  var scenes = Array.isArray(src.scenes) ? src.scenes.map(normalizeScene) : [];

  return {
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
}

function shorten(text, max){
  var s = normalizeText(text);
  var limit = Number(max || 120);
  if (!s) return '';
  if (s.length <= limit) return s;
  return s.slice(0, Math.max(0, limit - 1)).trimEnd() + '…';
}

function statusLabel(status){
  var s = normalizeText(status).toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  return 'pending';
}

function renderBookSummary(plan){
  return `
    <div class="cbb-meta-grid">
      <div class="cbb-meta-item"><span class="k">Theme</span><span class="v">${esc(plan.theme || '-')}</span></div>
      <div class="cbb-meta-item"><span class="k">Age Group</span><span class="v">${esc(plan.ageGroup || '-')}</span></div>
      <div class="cbb-meta-item"><span class="k">Page Target</span><span class="v">${esc(String(plan.pageTarget || 0))}</span></div>
      <div class="cbb-meta-item"><span class="k">Style</span><span class="v">${esc(plan.style || '-')}</span></div>
      <div class="cbb-meta-item"><span class="k">Status</span><span class="v">${esc(plan.status || '-')}</span></div>
      <div class="cbb-meta-item"><span class="k">Scenes</span><span class="v">${esc(String((plan.scenes || []).length))}</span></div>
    </div>
  `;
}

function renderSceneCard(scene){
  var tags = Array.isArray(scene.tags) && scene.tags.length
    ? scene.tags.map(function(tag){
        return '<span class="cbb-tag">' + esc(tag) + '</span>';
      }).join('')
    : '<span class="cbb-tag muted">no tags</span>';

  return `
    <div class="cbb-scene-card">
      <div class="cbb-scene-head">
        <div class="cbb-scene-no">#${esc(String(scene.index))}</div>
        <div class="cbb-scene-title">${esc(scene.title)}</div>
        <div class="cbb-scene-status is-${esc(statusLabel(scene.status))}">${esc(scene.status)}</div>
      </div>

      <div class="cbb-scene-tags">${tags}</div>

      <div class="cbb-scene-prompt">
        <span class="k">Prompt:</span>
        <span class="v">${esc(shorten(scene.promptBase, 160) || '-')}</span>
      </div>
    </div>
  `;
}

function renderPagePreview(scene, plan){
  return `
    <div class="cbb-paper">
      <div class="cbb-paper-inner">
        <div class="cbb-page-head">
          <div>
            <div class="cbb-page-theme">${esc(plan.theme || 'Coloring Book')}</div>
            <div class="cbb-page-title">${esc(scene.title)}</div>
          </div>
          <div class="cbb-page-no">p.${esc(String(scene.index))}</div>
        </div>

        <div class="cbb-image-slot">
          <div class="cbb-image-slot-inner">
            <div class="cbb-image-label">IMAGE PLACEHOLDER</div>
            <div class="cbb-image-note">Future coloring page preview</div>
          </div>
        </div>

        <div class="cbb-page-footer">
          <div class="cbb-page-status">
            <span class="k">Status:</span>
            <span class="v is-${esc(statusLabel(scene.status))}">${esc(scene.status)}</span>
          </div>

          <div class="cbb-page-tags">
            ${(scene.tags || []).length
              ? scene.tags.map(function(tag){
                  return '<span class="cbb-tag">' + esc(tag) + '</span>';
                }).join('')
              : '<span class="cbb-tag muted">no tags</span>'
            }
          </div>

          <div class="cbb-page-prompt">
            <span class="k">Prompt:</span>
            <span class="v">${esc(shorten(scene.promptBase, 120) || '-')}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export class ColoringBookBuilderModule {
  constructor(app){
    this.app = app;
    this.id = 'coloring_book';
    this.title = 'Coloring Book Builder';
  }

  async init(){}

  render(root){
    var seed = Storage.get('coloring:builder_seed', {
      mode: 'FOLHEAR',
      pageIndex: 0
    });

    var plan = normalizePlan(Storage.get('coloring:book_plan', null) || {});
    var hasPlan = !!(plan && plan.theme && Array.isArray(plan.scenes) && plan.scenes.length);

    function saveSeed(next){
      Storage.set('coloring:builder_seed', next || {
        mode: 'FOLHEAR',
        pageIndex: 0
      });
    }

    root.innerHTML = `
      <style>
        .cbb-wrap{ display:grid; gap:14px; }
        .cbb-toolbar{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
          justify-content:space-between;
          margin-bottom:10px;
        }
        .cbb-left,.cbb-right{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
        }
        .cbb-mini{ font-size:12px; opacity:.8; }

        .cbb-meta-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap:10px;
          margin-top:10px;
        }
        .cbb-meta-item{
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          padding:10px 12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:4px;
        }
        .cbb-meta-item .k{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .cbb-meta-item .v{
          font-size:14px;
          font-weight:700;
          word-break:break-word;
        }

        .cbb-empty{
          border:1px dashed rgba(255,255,255,.18);
          border-radius:14px;
          padding:16px;
        }

        .cbb-list{
          display:grid;
          gap:12px;
          margin-top:14px;
        }
        .cbb-scene-card{
          border:1px solid rgba(255,255,255,.08);
          border-radius:14px;
          padding:12px;
          background:rgba(255,255,255,.03);
          display:grid;
          gap:10px;
        }
        .cbb-scene-head{
          display:grid;
          grid-template-columns:auto 1fr auto;
          gap:10px;
          align-items:center;
        }
        .cbb-scene-no{
          font-size:12px;
          font-weight:900;
          opacity:.8;
        }
        .cbb-scene-title{
          font-size:15px;
          font-weight:800;
          line-height:1.2;
        }
        .cbb-scene-status{
          font-size:11px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.4px;
          padding:5px 8px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
        }
        .cbb-scene-status.is-pending{ opacity:.85; }
        .cbb-scene-status.is-approved{ opacity:1; }
        .cbb-scene-status.is-rejected{ opacity:.8; }

        .cbb-scene-tags,
        .cbb-page-tags{
          display:flex;
          gap:6px;
          flex-wrap:wrap;
        }
        .cbb-tag{
          font-size:11px;
          padding:5px 8px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.10);
          background:rgba(255,255,255,.03);
        }
        .cbb-tag.muted{ opacity:.65; }

        .cbb-scene-prompt,
        .cbb-page-prompt,
        .cbb-page-status{
          display:grid;
          gap:4px;
        }
        .cbb-scene-prompt .k,
        .cbb-page-prompt .k,
        .cbb-page-status .k{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          opacity:.72;
        }
        .cbb-scene-prompt .v,
        .cbb-page-prompt .v,
        .cbb-page-status .v{
          font-size:13px;
          line-height:1.35;
          word-break:break-word;
        }

        .cbb-paper-wrap{
          display:flex;
          justify-content:center;
          margin-top:14px;
        }
        .cbb-paper{
          width:min(100%, 560px);
          aspect-ratio:8.5 / 11;
          background:#fff;
          color:#111;
          border:1px solid rgba(0,0,0,.8);
          box-shadow:0 10px 28px rgba(0,0,0,.22);
        }
        .cbb-paper-inner{
          height:100%;
          display:grid;
          grid-template-rows:auto 1fr auto;
          gap:14px;
          padding:18px;
          overflow:hidden;
        }
        .cbb-page-head{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
        }
        .cbb-page-theme{
          font-size:12px;
          font-weight:800;
          letter-spacing:.5px;
          text-transform:uppercase;
          opacity:.72;
        }
        .cbb-page-title{
          margin-top:6px;
          font-size:24px;
          line-height:1.08;
          font-weight:900;
        }
        .cbb-page-no{
          font-size:14px;
          font-weight:800;
          opacity:.72;
          padding-top:4px;
          white-space:nowrap;
        }

        .cbb-image-slot{
          border:2px dashed rgba(0,0,0,.25);
          display:flex;
          align-items:center;
          justify-content:center;
          min-height:0;
          background:
            linear-gradient(135deg, rgba(0,0,0,.02), rgba(0,0,0,.04));
        }
        .cbb-image-slot-inner{
          text-align:center;
          padding:18px;
        }
        .cbb-image-label{
          font-size:18px;
          font-weight:900;
          letter-spacing:.8px;
        }
        .cbb-image-note{
          margin-top:6px;
          font-size:12px;
          opacity:.72;
        }

        .cbb-page-footer{
          display:grid;
          gap:10px;
        }
        .cbb-page-status .v.is-pending{ opacity:.85; }
        .cbb-page-status .v.is-approved{ opacity:1; }
        .cbb-page-status .v.is-rejected{ opacity:.8; }

        @media (max-width: 640px){
          .cbb-paper-inner{ padding:14px; gap:12px; }
          .cbb-page-title{ font-size:20px; }
          .cbb-image-label{ font-size:16px; }
          .cbb-scene-head{ grid-template-columns:auto 1fr; }
          .cbb-scene-status{ grid-column:1 / -1; justify-self:start; }
        }
      </style>

      <div class="cbb-wrap">
        <div class="card">
          <h2>Coloring Book Builder</h2>
          <p class="muted">
            Preview estrutural do livro de colorir. Aqui você valida se o plano virou
            um livro coerente antes da futura etapa de geração.
          </p>
          <div id="cbb_area"></div>
        </div>
      </div>
    `;

    var area = root.querySelector('#cbb_area');

    var renderEmpty = () => {
      area.innerHTML = `
        <div class="cbb-empty">
          <p class="muted"><b>Nenhum plano de coloring book encontrado.</b></p>
          <div class="row">
            <button class="btn primary" id="cbb_go_agent">Abrir Coloring Agent</button>
          </div>
          <p class="cbb-mini muted">Gere e salve um plano no Coloring Agent para visualizar aqui.</p>
        </div>
      `;

      var btn = area.querySelector('#cbb_go_agent');
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

        if (mode === 'LISTA') {
          area.innerHTML = `
            <div class="cbb-toolbar">
              <div class="cbb-left">
                <span class="cbb-mini"><b>${esc(plan.theme || 'COLORING BOOK')}</b></span>
                <span class="cbb-mini">• age <b>${esc(plan.ageGroup || '-')}</b></span>
                <span class="cbb-mini">• pages <b>${esc(String(plan.pageTarget || 0))}</b></span>
              </div>

              <div class="cbb-right">
                <button class="btn primary" id="cbb_mode_folhear">Folhear</button>
                <button class="btn" id="cbb_mode_lista">Lista</button>
              </div>
            </div>

            ${renderBookSummary(plan)}

            <div class="cbb-list">
              ${plan.scenes.map(renderSceneCard).join('')}
            </div>

            <div class="cbb-toolbar" style="margin-top:12px">
              <div class="cbb-left">
                <button class="btn" id="cbb_go_agent">Abrir Coloring Agent</button>
              </div>
            </div>
          `;

          var goAgentBtnList = area.querySelector('#cbb_go_agent');
          if (goAgentBtnList) {
            goAgentBtnList.onclick = function(){
              var nav = document.querySelector('.navitem[data-view="coloring_agent"]');
              if (nav && nav.click) nav.click();
            };
          }

          var folhearBtnList = area.querySelector('#cbb_mode_folhear');
          if (folhearBtnList) {
            folhearBtnList.onclick = function(){
              mode = 'FOLHEAR';
              save();
              paint();
            };
          }

          return;
        }

        area.innerHTML = `
          <div class="cbb-toolbar">
            <div class="cbb-left">
              <span class="cbb-mini"><b>${esc(plan.theme || 'COLORING BOOK')}</b></span>
              <span class="cbb-mini">• age <b>${esc(plan.ageGroup || '-')}</b></span>
              <span class="cbb-mini">• pages <b>${esc(String(plan.pageTarget || 0))}</b></span>
              <span class="cbb-mini">• scene <b>${esc(String(pageIndex + 1))}/${esc(String(plan.scenes.length))}</b></span>
            </div>

            <div class="cbb-right">
              <button class="btn" id="cbb_prev">◀</button>
              <button class="btn" id="cbb_next">▶</button>
              <button class="btn" id="cbb_mode_lista">Lista</button>
              <button class="btn primary" id="cbb_mode_folhear">Folhear</button>
            </div>
          </div>

          ${renderBookSummary(plan)}

          <div class="cbb-paper-wrap">
            ${renderPagePreview(current, plan)}
          </div>

          <div class="cbb-toolbar" style="margin-top:12px">
            <div class="cbb-left">
              <button class="btn" id="cbb_go_agent">Abrir Coloring Agent</button>
            </div>
          </div>
        `;

        var prevBtn = area.querySelector('#cbb_prev');
        var nextBtn = area.querySelector('#cbb_next');
        var listBtn = area.querySelector('#cbb_mode_lista');
        var goAgentBtn = area.querySelector('#cbb_go_agent');

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

        if (goAgentBtn) {
          goAgentBtn.onclick = function(){
            var nav = document.querySelector('.navitem[data-view="coloring_agent"]');
            if (nav && nav.click) nav.click();
          };
        }
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
