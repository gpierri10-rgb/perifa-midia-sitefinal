# Perifa Midia Site Oficial

Esta pasta contem a versao oficial do site da Perifa Midia pronta para subir em um repositorio no GitHub e publicar no GitHub Pages.

## Estrutura principal

- `index.html`: pagina principal.
- `crm.html`: tela local de CRM.
- `assets/css/`: estilos do site e do CRM.
- `assets/js/`: scripts do formulario, menu e banco local.
- `assets/images/`: imagens usadas no site.
- `.nojekyll`: compatibilidade com GitHub Pages.
- `CNAME`: dominio customizado.
- `robots.txt` e `sitemap.xml`: arquivos basicos de indexacao.

## Publicacao no GitHub

1. Crie um repositorio novo no GitHub.
2. Envie o conteudo desta pasta para a branch `main`.
3. No GitHub, abra `Settings > Pages`.
4. Em `Build and deployment`, selecione `Deploy from a branch`.
5. Escolha a branch `main` e a pasta `/ (root)`.
6. Aguarde a publicacao do site.

## Dominio

O projeto ja inclui `CNAME` apontando para `perifamidia.com.br`.

Se o dominio mudar, atualize tambem:

- `index.html`
- `robots.txt`
- `sitemap.xml`
- `CNAME`

## Observacao

O CRM funciona localmente no navegador. Para receber leads reais de varios usuarios em producao, sera preciso conectar o formulario a um backend.
