# SuPets

SuPets conecta cidadãos e ONGs na proteção animal. Cidadãos registram ocorrências, ambos os perfis ajudam a resolvê-las, e ONGs organizam campanhas com participação de cidadãos.

## Executar localmente

Pré-requisito: **Docker em execução, com contêineres Linux** (Docker Desktop no Windows/macOS ou uma instalação completa do Docker Engine no Linux). Arquiteturas previstas: amd64 e arm64. Não é necessário instalar Java, Maven, Node, PostgreSQL ou Jenkins no computador.

Na raiz do repositório, macOS/Linux:

```sh
sh ./supets.sh up
sh ./supets.sh verify
sh ./supets.sh down
```

Windows PowerShell 5.1 ou 7:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\supets.ps1 up
powershell -NoProfile -ExecutionPolicy Bypass -File .\supets.ps1 verify
powershell -NoProfile -ExecutionPolicy Bypass -File .\supets.ps1 down
```

Abra **http://localhost:8180** depois da mensagem `Ready`. O primeiro build baixa imagens e dependências; reiniciar uma versão sem alterações reutiliza suas imagens. `down` para os contêineres, mas **preserva os bancos e as contas**. Não há senha administrativa pública nem contas semeadas para login.

Porta ocupada? Use, por exemplo, `sh ./supets.sh up --project demonstracao --port 8181` e mantenha esses argumentos nos comandos seguintes. O launcher não encerra serviços alheios. Para instalações não convencionais, `DOCKER_BIN` permite indicar o executável do Docker.

`up` comprova inicialização/readiness, não uma aprovação de testes. `verify` usa bancos descartáveis isolados e as imagens exatas sob teste; não usa os dados da aplicação. Falhas retornam código diferente de zero e preservam relatórios em `.supets/<projeto>/reports/`.

## Exemplo de uso

1. Em **Cadastrar-se**, crie dois cidadãos e duas ONGs com e-mails distintos, endereço de teste, UF **SP** e município **São Paulo**. Escolha suas próprias senhas.
2. Documentos sintéticos com dígitos verificadores válidos: cidadãos `93100000153` e `93100000234`; ONGs `93100000000144` e `12ABC34501DE35`. Use-os somente em ambiente de teste: cálculo de dígitos **não comprova identidade nem situação cadastral**.
3. Como cidadão, registre uma ocorrência e todos os dados do animal. Selecione um ponto no mapa ou informe latitude/longitude e aplique. Edite a ocorrência enquanto estiver **ABERTA**.
4. Entre com outro cidadão ou ONG, localize a ocorrência e assuma a ajuda. Confira a mudança de estado; o responsável pode concluir o atendimento. Recarregue para conferir persistência.
5. Como ONG, crie e edite uma campanha. Como cidadão, participe e confira a participação/contagem após recarregar.
6. Encerre com `down`, inicie novamente com `up` e confirme que as contas e registros continuam disponíveis.

Municípios vêm de um snapshot local do IBGE: cadastro não depende de consulta externa. Os mapas usam tiles externos; sem tiles/geolocalização, a seleção manual de coordenadas continua disponível. Localhost é contexto seguro para geolocalização; a publicação cloud exige HTTPS confiável.

## Stack e organização

- Java 21, Maven Wrapper 3.9.16, Spring Boot/Cloud, JPA, Bean Validation e Flyway.
- PostgreSQL 16: um banco por serviço de negócio, sem portas públicas.
- React 19, Vite, Chakra UI, React Router e Leaflet; Node 22 e npm fixados no build.
- Docker Compose, Caddy 2.11.9; Jenkins opcional.

```text
microsservicos/gateway/     autenticação, roteamento, limites e readiness
microsservicos/community/   cidadãos, ONGs, login e campanhas
microsservicos/ocorrencias/  ocorrências, animais e geografia
frontend/supets/            interface React e testes Node
shared/data/               municípios IBGE e metadados
deploy/                    imagens, Compose, Caddy, CI e verificadores
docs/                      contratos de API e procedimentos de teste
modelagem/                 casos de uso e diagramas
supets.sh / supets.ps1      entradas portáveis; lógica comum em deploy/supets.mjs
```

## Documentação

- [Contratos e procedimentos de teste](docs/validacao.md).
- [Deploy, backup, recuperação e Jenkins](deploy/README.md).
- [Gateway e autenticação](docs/gateway.md); [campanhas](docs/campanhas-api.md).
- [Estado e pendências](TODO.md); [topologia](modelagem/implantacao-2.md).
