Quero criar o próximo arquivo do Bright Cup Creator.

ARQUIVO:
`/js/core/print_ready_payload.js`

OBJETIVO:
- consolidar em um payload único a preparação lógica final de impressão
- juntar interior + cover full wrap em um objeto central
- ainda SEM gerar PDF real
- ainda SEM ZIP real
- sem DOM
- sem canvas
- sem dependências externas
- compatível com Safari/iOS

CONTEXTO:
Já existem:
- `pdf_export_prep.js`
- `interior_pdf_payload.js`
- `cover_pdf_payload.js`
- `fullwrap_pdf_payload.js`
- `final_export_bundle.js`

Agora quero o payload lógico mestre da futura saída print-ready.

FUNÇÃO ESPERADA:
`buildPrintReadyPayload(plan)`

ENTRADA:
- recebe o `plan` completo do coloring pipeline

SAÍDA ESPERADA:
objeto com esta estrutura:

- `payloadVersion`
- `type`
- `generatedAt`
- `canBuildPrintReady`
- `summary`
- `book`
- `interior`
- `cover`
- `checks`

TYPE:
`brightcup_print_ready_payload`

REGRAS:
1. `interior` deve vir do `interior_pdf_payload.js`
2. `cover` deve vir do `fullwrap_pdf_payload.js`
3. `book` deve consolidar os dados principais do projeto
4. `checks` deve conter pelo menos:
   - `interiorReady`
   - `coverReady`
   - `pageTarget`
   - `interiorPages`
   - `missingInteriorPages`
5. `canBuildPrintReady` só pode ser `true` quando:
   - interior payload estiver apto
   - cover full wrap estiver apto
   - plan.id existir
   - pageTarget > 0
6. `summary` deve deixar claro se o projeto está logicamente pronto para a futura etapa print-ready ou se ainda está bloqueado
7. não inventar integração com KDP
8. não inventar geração de arquivo físico
9. manter fallback defensivo total
10. sempre retornar objeto utilizável mesmo em erro

IMPORTANTE:
- esse arquivo é apenas payload lógico mestre
- não gerar PDF real
- não gerar ZIP real
- não criar engine visual
- arquivo completo, pronto para substituir

FORMATO DE ENTREGA:
Comece com:
`/* FILE: /js/core/print_ready_payload.js */`

Depois entregue o arquivo completo.
