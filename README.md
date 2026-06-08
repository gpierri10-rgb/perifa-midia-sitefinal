# Perifa Mídia Landing Page

Landing page estática da Perifa Mídia, refatorada com HTML5 semântico, CSS e JavaScript separados, responsividade, melhorias de acessibilidade, metadados de SEO e configuração para GitHub Pages e Vercel.

## Estrutura

- `index.html`: página principal.
- `assets/css/styles.css`: estilos da landing page.
- `assets/js/main.js`: menu mobile e validação do formulário.
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

## Deploy no GitHub Pages

1. Suba estes arquivos para um repositório GitHub.
2. Em Settings > Pages, selecione a branch principal e a pasta raiz.
3. Publique e atualize o domínio canônico em `index.html`, `robots.txt` e `sitemap.xml` se usar outro domínio.

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Use as configurações padrão de projeto estático.
3. Publique e configure o domínio final.

## Observação de produção

O formulário está pronto no front-end, com validação e mensagem acessível. Para captar leads de verdade, conecte o `action` do formulário a uma ferramenta de automação, CRM ou endpoint serverless.
