/* FILE: /js/modules/publishing_center.js */
// Bright Cup Creator — Publishing Center Module v0.1 SAFE
// Hub operacional da camada de publicação/editoração
// - navegação segura via CustomEvent('bcc:navigate')
// - leve para Safari/iPhone
// - sem backend
// - sem canvas
// - sem dependências externas

export class PublishingCenterModule {

  constructor(app){
    this.app = app;
    this.id = 'publishing_center';
    this.title = 'Publishing Center';
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
        .pbc-wrap{
          padding:16px;
          display:block;
        }

        .pbc-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
          gap:14px;
        }

        .pbc-hero{
          background:#1c1c1c;
          border:1px solid #2a2a2a;
          border-radius:12px;
          padding:18px;
        }

        .pbc-title{
          font-size:18px;
          font-weight:600;
          color:#fff;
          margin-bottom:6px;
        }

        .pbc-summary{
          font-size:13px;
          color:#aaa;
        }

        .pbc-section{
          background:#1c1c1c;
          border:1px solid #2a2a2a;
          border-radius:12px;
          padding:16px;
        }

        .pbc-section-title{
          font-size:15px;
          font-weight:600;
          color:#fff;
          margin-bottom:10px;
        }

        .pbc-card-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
          gap:10px;
        }

        .pbc-card{
          background:#141414;
          border:1px solid #2a2a2a;
          border-radius:10px;
          padding:12px;
          cursor:pointer;
          transition:all .15s ease;
        }

        .pbc-card:hover{
          border-color:#3a3a3a;
          transform:translateY(-1px);
        }

        .pbc-card-title{
          font-size:13px;
          font-weight:600;
          color:#fff;
          margin-bottom:4px;
        }

        .pbc-card-desc{
          font-size:11px;
          color:#999;
        }
      </style>

      <div class="pbc-wrap">

        <div class="pbc-grid">

          <div class="pbc-hero">
            <div class="pbc-title">Publishing Center</div>
            <div class="pbc-summary">
              Área operacional de editoração e publicação.  
              Aqui você prepara o livro, exporta os pacotes e finaliza o release.
            </div>
          </div>

          <div class="pbc-section">
            <div class="pbc-section-title">Publishing Workflow</div>

            <div class="pbc-card-grid">

              <div class="pbc-card" data-view="test_book_center">
                <div class="pbc-card-title">Test Book Center</div>
                <div class="pbc-card-desc">
                  Gerar e validar o livro de teste
                </div>
              </div>

              <div class="pbc-card" data-view="master_test_book_center">
                <div class="pbc-card-title">Master Test Book</div>
                <div class="pbc-card-desc">
                  Consolidar estrutura final do test book
                </div>
              </div>

              <div class="pbc-card" data-view="master_test_book_export_center">
                <div class="pbc-card-title">Master Export</div>
                <div class="pbc-card-desc">
                  Preparar exportações do test book
                </div>
              </div>

              <div class="pbc-card" data-view="export_center">
                <div class="pbc-card-title">Export Center</div>
                <div class="pbc-card-desc">
                  Gerar pacotes exportáveis
                </div>
              </div>

              <div class="pbc-card" data-view="release_center">
                <div class="pbc-card-title">Release Center</div>
                <div class="pbc-card-desc">
                  Preparar publicação final
                </div>
              </div>

            </div>
          </div>

          <div class="pbc-section">
            <div class="pbc-section-title">Navigation</div>

            <div class="pbc-card-grid">

              <div class="pbc-card" data-view="workflow_center">
                <div class="pbc-card-title">Workflow Center</div>
                <div class="pbc-card-desc">
                  Voltar para os fluxos operacionais
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    `;

    var cards = root.querySelectorAll('.pbc-card[data-view]');
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
