/* FILE: /js/modules/workflow_center.js */
// Bright Cup Creator — Workflow Center Module v0.2 SAFE
// Hub operacional dos fluxos do sistema
// - navegação segura via CustomEvent('bcc:navigate')
// - leve para Safari/iPhone
// - sem backend
// - sem canvas
// - sem dependências externas

export class WorkflowCenterModule {

  constructor(app){
    this.app = app;
    this.id = 'workflow_center';
    this.title = 'Workflow Center';
  }

  async init(){}

  render(root){

    function navigate(view){
      try{
        document.dispatchEvent(
          new CustomEvent('bcc:navigate',{ detail:{ view:view } })
        );
      }catch(e){}
    }

    root.innerHTML = `
      <style>
        .wfc-wrap{
          padding:16px;
          display:block;
        }

        .wfc-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
          gap:14px;
        }

        .wfc-hero{
          background:#1c1c1c;
          border:1px solid #2a2a2a;
          border-radius:12px;
          padding:18px;
        }

        .wfc-title{
          font-size:18px;
          font-weight:600;
          color:#fff;
          margin-bottom:6px;
        }

        .wfc-summary{
          font-size:13px;
          color:#aaa;
        }

        .wfc-section{
          background:#1c1c1c;
          border:1px solid #2a2a2a;
          border-radius:12px;
          padding:16px;
        }

        .wfc-section-title{
          font-size:15px;
          font-weight:600;
          color:#fff;
          margin-bottom:10px;
        }

        .wfc-card-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
          gap:10px;
        }

        .wfc-card{
          background:#141414;
          border:1px solid #2a2a2a;
          border-radius:10px;
          padding:12px;
          cursor:pointer;
          transition:all .15s ease;
        }

        .wfc-card:hover{
          border-color:#3a3a3a;
          transform:translateY(-1px);
        }

        .wfc-card-title{
          font-size:13px;
          font-weight:600;
          color:#fff;
          margin-bottom:4px;
        }

        .wfc-card-desc{
          font-size:11px;
          color:#999;
        }
      </style>

      <div class="wfc-wrap">

        <div class="wfc-grid">

          <div class="wfc-hero">
            <div class="wfc-title">Workflow Center</div>
            <div class="wfc-summary">
              Os agentes geram ideias.  
              Aqui ficam os fluxos operacionais para transformar ideias em livros.
            </div>
          </div>

          <div class="wfc-section">
            <div class="wfc-section-title">Coloring Workflow</div>

            <div class="wfc-card-grid">

              <div class="wfc-card" data-view="coloring_book">
                <div class="wfc-card-title">Coloring Builder</div>
                <div class="wfc-card-desc">Montar páginas do livro</div>
              </div>

              <div class="wfc-card" data-view="coloring_review">
                <div class="wfc-card-title">Coloring Review</div>
                <div class="wfc-card-desc">Revisar e aprovar cenas</div>
              </div>

              <div class="wfc-card" data-view="test_book_center">
                <div class="wfc-card-title">Test Book</div>
                <div class="wfc-card-desc">Gerar livro de teste</div>
              </div>

              <div class="wfc-card" data-view="master_test_book_center">
                <div class="wfc-card-title">Master Test Book</div>
                <div class="wfc-card-desc">Consolidar livro</div>
              </div>

              <div class="wfc-card" data-view="master_test_book_export_center">
                <div class="wfc-card-title">Master Export</div>
                <div class="wfc-card-desc">Preparar exportação</div>
              </div>

              <div class="wfc-card" data-view="export_center">
                <div class="wfc-card-title">Export Center</div>
                <div class="wfc-card-desc">Exportar pacote</div>
              </div>

              <div class="wfc-card" data-view="release_center">
                <div class="wfc-card-title">Release Center</div>
                <div class="wfc-card-desc">Preparar publicação</div>
              </div>

            </div>
          </div>

          <div class="wfc-section">
            <div class="wfc-section-title">Cultural Workflow</div>

            <div class="wfc-card-grid">

              <div class="wfc-card" data-view="book">
                <div class="wfc-card-title">Cultural Builder</div>
                <div class="wfc-card-desc">Montar livro cultural</div>
              </div>

            </div>
          </div>

          <div class="wfc-section">
            <div class="wfc-section-title">Navigation</div>

            <div class="wfc-card-grid">

              <div class="wfc-card" data-view="agent_center">
                <div class="wfc-card-title">Agent Center</div>
                <div class="wfc-card-desc">Voltar para seleção de agentes</div>
              </div>

            </div>
          </div>

        </div>

      </div>
    `;

    var cards = root.querySelectorAll('.wfc-card[data-view]');
    var i;

    for (i = 0; i < cards.length; i++){
      (function(card){
        var view = card.getAttribute('data-view');

        card.addEventListener('click',function(){
          navigate(view);
        });

      })(cards[i]);
    }

  }

}
