# Clube do Auto - Avaliacao de Compra

PWA usado pela unidade Osasco para avaliacao de veiculos de compra.

## Estrutura

- `index.html`: entrada do app e marcacao das telas.
- `assets/`: logo e icones do PWA.
- `css/styles.css`: visual completo do app.
- `js/config.js`: caminhos base para local/GitHub Pages.
- `js/manifest-links.js`: links de manifest e icone Apple.
- `js/brand-assets.js`: aplicacao da logo nas telas.
- `js/modules/users.js`: painel de usuarios, bloqueio/reativacao de acesso e validacao de usuario bloqueado no login.
- `js/app.js`: fluxo principal, Firebase, formulario, historico, painel, FIPE e rascunho local.
- `js/pwa.js`: registro do service worker.
- `sw.js`: cache offline/PWA.
- `manifest.webmanifest`: dados de instalacao do app.

## Observacao importante

A organizacao em pastas nao altera colecoes do Firebase, regras de acesso por cargo ou dados ja salvos.

## Refinamentos operacionais

- Valores em reais agora aceitam formato brasileiro, como `41.990,00`, sem multiplicar por 100.
- Dados privados do atendimento (`cliente`, `telefone`, `local`, `captacao`) nao sao restaurados por rascunho antigo.
- Depois de copiar/enviar um relatorio, os dados do cliente sao limpos para reduzir erro na proxima avaliacao.
- Cadastro agora abre uma subtela premium com nome de usuario, e-mail e senha.
- O painel Admin permite alterar o nome de usuario dos cadastros existentes.
- Nova Avaliacao ganhou um cockpit operacional com percentual de prontidao e alertas de erro antes do envio.
- A tela Nova Avaliacao foi limpa: navegacao rapida, barra de progresso, fluxo rapido e cards redundantes foram ocultados para reduzir poluicao visual.
