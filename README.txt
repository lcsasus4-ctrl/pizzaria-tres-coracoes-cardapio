# Ohana Snack House — Cardápio Premium + Painel (Decap CMS + GitHub) — CORRIGIDO

## Publicar (GitHub + Netlify)
1) Crie um repositório no GitHub e suba estes arquivos.
2) Na Netlify: "New site from Git" e conecte o repositório.
   - Build command: (vazio)
   - Publish directory: (vazio) / raiz

## Configurar o painel
Edite: admin/config.yml
Troque:
  repo: SEUUSUARIO/SEU_REPO
Ex:
  repo: jonybether/ohana-cardapio

Se seu branch for master, troque:
  branch: main -> master

## Abrir o painel
https://SEU-SITE.netlify.app/admin/

## Onde o cardápio é salvo
data/menu.json
Formato:
{ "items": [ ... ] }

## WhatsApp
No app.js, troque:
  whatsapp: "55SEUNUMEROAQUI"
