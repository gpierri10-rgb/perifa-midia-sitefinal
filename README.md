# Perifa Mídia Landing Page

Landing page estática da Perifa Mídia, refatorada com HTML5 semântico, CSS e JavaScript separados, responsividade, melhorias de acessibilidade, metadados de SEO e configuração para GitHub Pages e Vercel.

## Estrutura

- `index.html`: página principal.
- `assets/css/styles.css`: estilos da landing page.
- `assets/css/crm.css`: estilos da tela de CRM.
- `assets/js/main.js`: menu mobile e validação do formulário.
- `assets/js/database.js`: banco local dos leads no navegador.
- `assets/js/crm.js`: cadastro, filtros, edição, importação e exportação do CRM.
- `crm.html`: CRM local para gerenciar leads.
- `assets/images/`: imagens otimizadas usadas na página.
- `.nojekyll`: compatibilidade com GitHub Pages.
- `vercel.json`: cabeçalhos e cache para deploy na Vercel.
- `robots.txt` e `sitemap.xml`: arquivos básicos para rastreamento.

## Preview local

Abra `index.html` no navegador ou rode um servidor estático na pasta do projeto:

```bash
python3 -m http.server 4173
```

Depois acesse `http://localhost:4173`.

## CRM e banco de dados local

Abra `crm.html` no mesmo domínio da landing page. O formulário público salva os leads no banco local do navegador, e a tela de CRM permite cadastrar, editar, filtrar, excluir, exportar CSV e fazer backup/importação em JSON.

Para testar localmente, use o servidor estático acima e acesse:

```bash
http://localhost:4173/crm.html
```

Observação: este banco fica no navegador usado para acessar o site. Para captar leads de todos os visitantes em produção, conecte o formulário a um backend como Supabase, Airtable, HubSpot, RD Station ou uma função serverless.

## Deploy no GitHub Pages

1. Suba estes arquivos para um repositório GitHub.
2. Em Settings > Pages, selecione a branch principal e a pasta raiz.
3. Publique e atualize o domínio canônico em `index.html`, `robots.txt` e `sitemap.xml` se usar outro domínio.

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Use as configurações padrão de projeto estático.
3. Publique e configure o domínio final.

## Observação de produção

O CRM local é útil para validação, organização inicial e importação/exportação. Para operação comercial com vários usuários, use um banco centralizado e autenticação.
