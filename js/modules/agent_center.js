/* FILE: /js/modules/agent_center.js */
// Bright Cup Creator — Agent Center Module v0.3 SAFE
// Hub de agentes do sistema
// - navegação segura via CustomEvent('bcc:navigate')
// - leve para Safari/iPhone
// - sem backend
// - sem canvas
// - sem dependências externas

export class AgentCenterModule {

  constructor(app){
    this.app = app;
    this.id = 'agent_center';
    this.title = 'Agent Center';
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
        .ac-wrap{
          padding:16px;
          display:block;
        }

        .ac-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
          gap:14px;
        }

        .ac-hero{
          background:#1c1c1c;
          border:1px solid #2a2a2a;
          border-radius:12px;
          padding:18px;
        }

        .ac-title{
          font-size:18px;
          font-weight:600;
          color:#fff;
          margin-bottom:6px;
        }

        .ac-summary{
          font-size:13px;
          color:#aaa;
        }

        .ac-section{
          background:#1c1c1c;
          border:1px solid #2a2a2a;
          border-radius:12px;
          padding:16px;
        }

        .ac-section-title{
          font-size:15px;
          font-weight:600;
          color:#fff;
          margin-bottom:10px;
        }

        .ac-card-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
          gap:10px;
        }

        .ac-card{
          background:#141414;
          border:1px solid #2a2a2a;
          border-radius:10px;
          padding:12px;
          cursor:pointer;
          transition:all .15s ease;
        }

        .ac-card:hover{
          border-color:#3a3a3a;
          transform:translateY(-1px);
        }

        .ac-card-title{
          font-size:13px;
          font-weight:600;
          color:#fff;
          margin-bottom:4px;
        }

        .ac-card-desc{
          font-size:11px;
          color:#999;
        }
      </style>

      <div class="ac-wrap">

        <div class="ac-grid">

          <div class="ac-hero">
            <div class="ac-title">Agent Center</div>
            <div class="ac-summary">
              Escolha um agente para iniciar a criação de conteúdo.
              Depois continue o processo no Workflow Center.
            </div>
          </div>

          <div class="ac-section">
            <div class="ac-section-title">Agents</div>

            <div class="ac-card-grid">

              <div class="ac-card" data-view="coloring_agent">
                <div class="ac-card-title">Coloring Agent</div>
                <div class="ac-card-desc">
                  Gerar ideias e cenas para livros de colorir
                </div>
              </div>

              <div class="ac-card" data-view="cultural">
                <div class="ac-card-title">Cultural Agent</div>
                <div class="ac-card-desc">
                  Criar conteúdo cultural e educativo
                </div>
              </div>

            </div>
          </div>

          <div class="ac-section">
            <div class="ac-section-title">Operations</div>

            <div class="ac-card-grid">

              <div class="ac-card" data-view="workflow_center">
                <div class="ac-card-title">Workflow Center</div>
                <div class="ac-card-desc">
                  Acessar os fluxos operacionais do projeto
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    `;

    var cards = root.querySelectorAll('.ac-card[data-view]');
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
