# Estado e pendências

Versões e dependências: `pom.xml` de cada serviço, `frontend/supets/package.json` e lockfile. Comandos de execução: [README](README.md). Contratos e cenários: [testes](docs/validacao.md).

## Funcionalidades

- [x] Cadastro e login de cidadão/ONG com JWT, documentos válidos e endereço canônico.
- [x] Reserva transacional de e-mail entre perfis e rejeição de identidades ambíguas.
- [x] Consulta de perfis por UUID sem dados privados.
- [x] Autorização no gateway e nas operações de negócio; cabeçalhos de identidade não são aceitos do cliente.
- [x] API de campanhas: criação, consulta, edição da ONG proprietária e participação de cidadãos.
- [x] API de ocorrências: criação por cidadão, consulta geográfica, edição completa do autor enquanto aberta, atendimento e resolução.
- [x] Preservação de IDs/metadados e serialização dos conflitos de edição/atendimento.
- [x] Catálogo de municípios empacotado, CPF/CNPJ numérico/alfanumérico e categorias de ocorrência atualizadas.
- [x] Interface de cadastro, sessão e navegação validada em desktop, viewport móvel e teclado no Chrome.
- [x] Interface de ocorrências, edição, mapas, localização e recuperação de erros validada no Chrome.
- [x] Interface de campanhas, filtros, calendário e reconciliação de conflitos validada no Chrome.

## Build e execução

- [x] Lockfile npm; builds com `npm ci`, Node e imagens-base fixados.
- [x] Imagens Docker de todos os serviços e frontend; stack local iniciada com readiness.
- [x] Chave JWT compartilhada gerada; sem fallback público de assinatura.
- [x] Configuração privada fora do repositório; exemplos sem credenciais utilizáveis.
- [x] Caddy como entrada da aplicação; backends/bancos sem portas publicadas.
- [x] Testes Java, frontend, PostgreSQL e APIs integradas em ambientes descartáveis.
- [x] Proteção de migrations contra histórico legado inseguro, sem alteração de V1–V4.
- [x] Release/importação sem rebuild, rollback, retenção de assets e recuperação de bloqueios validados.
- [x] Backup/restauração isolada e rotação de credenciais validados com preservação dos dados.
- [x] Setup limpo em caminho com espaços/acentos e persistência após parada/inicialização.
- [x] Setup nativo com PowerShell e Docker Desktop no Windows; cadastro, login e persistência após parada/inicialização.
- [ ] Validar execução e persistência nativas no macOS e arm64.

## Jenkins

- [x] Imagem/plugins, configuração administrativa privada e job candidato real executados.
- [x] Continuidade de estado entre operador e pipeline, hashes imutáveis e relatórios JUnit/TAP comprovados.
- [x] Falhas de testes/implantação, recuperação e implantação bem-sucedida validadas no pipeline.

## Implantação pública

- [x] HTTPS confiável no IPv4 público, redirecionamento e bloqueio externo das portas internas validados.
- [ ] Executar fluxos reais, persistência, falhas/recuperação e restore no servidor de destino.
- [ ] Medir recursos durante build/testes e uso concorrente antes de definir capacidade.
- [ ] Verificar persistência de certificados e observar renovação natural quando ocorrer.
- [ ] Investigar/revogar credenciais históricas nos ambientes em que tenham sido utilizadas.
