# Operação Docker e implantação pública

O mesmo launcher controla desenvolvimento local e implantação. A aplicação mantém Java/Spring, PostgreSQL e React; Caddy é a única entrada pública. Jenkins é opcional e tem uma trilha de validação separada.

## Execução local

Na raiz do repositório, com Docker em modo de contêineres Linux:

```sh
sh ./supets.sh up
sh ./supets.sh status
sh ./supets.sh logs community
sh ./supets.sh verify
sh ./supets.sh down
```

No Windows, substitua `sh ./supets.sh` por `powershell -NoProfile -ExecutionPolicy Bypass -File .\supets.ps1`. Acesso: `http://localhost:8180`. `--project <nome>` isola estado/volumes; `--port <porta>` escolhe a porta local. Mantenha os mesmos argumentos nas operações seguintes. `DOCKER_BIN` permite selecionar um executável Docker fora do PATH.

O primeiro build baixa dependências; os próximos aproveitam cache. `down` preserva dados, configurações e certificados. Não execute `docker compose down -v` para tentar corrigir inicialização. Um engine remoto, arquitetura incompatível, porta ocupada ou operação concorrente provoca recusa, não remoção de recursos alheios.

`up` verifica startup/readiness, **não** substitui `verify`. Os testes usam bancos descartáveis isolados, sem dados/credenciais do ambiente ativo. Relatórios ficam em `.supets/<projeto>/reports/`. Arquiteturas previstas: Linux amd64/arm64.

## Topologia e estado

- `web`: Caddy e arquivos estáticos; única publicação local em loopback ou pública em 80/443.
- `gateway`: autenticação, autorização de entrada e encaminhamento.
- `community` e `ocorrencias`: redes internas, cada um com PostgreSQL próprio.
- Volume de controle `supets-<projeto>-state`: configuração privada, manifests, operação exclusiva e evidências. Diretórios 0700; arquivos privados 0600.
- Volumes separados: dois bancos, certificados/configuração Caddy, arquivos estáticos da versão anterior e, opcionalmente, Jenkins.

O launcher gera quatro senhas independentes de banco e uma chave JWT compartilhada por community/gateway. Apps usam papéis PostgreSQL sem superuser/createdb/createrole; Caddy não recebe segredos. Alterar somente uma variável não altera a senha de um banco já inicializado. Perder o volume de controle não autoriza gerar senhas novas sobre bancos existentes.

Os containers Java usam UID 10001, raiz somente leitura e `/tmp` temporário. Apenas ferramentas administrativas e Jenkins acessam o socket Docker; esse acesso equivale a autoridade administrativa sobre o host.

| Componente | Quantidade | Limite inicial por container |
| --- | ---: | ---: |
| Java | 3 | 768 MiB, heap máximo 384 MiB |
| PostgreSQL | 2 | 512 MiB |
| Caddy | 1 | 128 MiB |
| Jenkins opcional | 1 | 1536 MiB |

Esses limites não são uma recomendação de tamanho de servidor. Builds, testes, memória nativa, sistema operacional e armazenamento também consomem recursos; meça o ambiente de destino antes de liberar a implantação. Não há dimensionamento automático.

## Release verificável, ativação e recuperação

```sh
sh ./supets.sh verify
sh ./supets.sh release
sh ./supets.sh deploy <release-id>
sh ./supets.sh verify-deploy
```

Use o mesmo projeto já verificado. `release` exporta `.supets/<projeto>/candidates/<id>.tar` e `<id>.tar.sha256`: fonte sanitizada, launchers, manifest e as imagens exatas de runtime/build/teste. Não inclui credenciais nem bancos. `verify --candidate <id>` valida as imagens importadas sem recompilar; as novas evidências ficam separadas do manifest imutável.

`verify-deploy` usa um ambiente descartável derivado do projeto; não injeta falhas nos bancos ativos. Exerce falhas de backend/banco, manutenção, rollback, retenção de assets, bloqueios, backup/restauração e rotação de senha.

Antes de ativar, o controlador valida candidato, arquitetura, configuração, imagens e espaço. Caddy entra em manutenção (`503`), o gateway e os escritores são parados, e a versão completa é iniciada. A abertura exige readiness dos dois serviços/bancos e hashes/MIME dos arquivos públicos. Uma breve interrupção durante recriação do proxy é esperada; não há promessa de zero downtime.

Se a ativação falhar, somente uma versão anterior compatível com as versões **reais dos dois esquemas** pode ser restaurada. A operação continua retornando falha mesmo após rollback bem-sucedido. Sem predecessor compatível, mantém manutenção e dados intactos. Rollback de imagem não desfaz migrations. Assets atuais e da versão imediatamente anterior são retidos; reiniciar a versão atual não avança esse histórico. Abas de versões mais antigas não têm essa garantia.

Ocorrências aceitam esquema vazio ou histórico conhecido completo V1–V4/V5, com checksums e estrutura compatíveis. Históricos antigos parciais, desconhecidos, divergentes ou tabelas não versionadas bloqueiam startup antes de migrations destrutivas. Não use `repair`, baseline artificial ou exclusão de volumes como atalho.

## Backup, restauração e segredos

```sh
sh ./supets.sh backup
sh ./supets.sh restore-check <backup-id>
```

O backup mantém ambos os serviços sem escrita durante os dois `pg_dump`, registra checksums e metadados, depois restaura readiness. A exportação restrita fica em `.supets/<projeto>/backups/<id>/`: dumps, metadados e `recovery.env`. Copie **todos** esses arquivos para fora do host via SSH/SCP; nunca os inclua em Git, candidatos ou logs. Volumes persistentes não substituem backup. Faça backup antes de releases e da desativação do ambiente.

`restore-check` restaura em PostgreSQL isolado com credenciais novas e verifica IDs, conteúdo, sequências, proprietários e relacionamentos. Não sobrescreve o banco ativo.

Para rotacionar credenciais, obtenha exclusividade de operação e mantenha manutenção com escritores parados. Altere a senha no papel PostgreSQL correspondente **e** na configuração privada; recrie o backend afetado, valide login TCP, readiness e dados. Se falhar, reverta ambos antes de reabrir. O cenário executável de referência está em `deploy/verification/backups.mjs`, `checkPasswordRotation`. Para JWT, atualize a configuração e recrie community/gateway juntos: sessões antigas tornam-se inválidas. Nunca exponha valores em comandos registrados ou documentação.

Credenciais históricas eventualmente usadas fora deste ambiente exigem investigação/revogação própria; gerar senhas novas aqui não comprova revogação em outro lugar.

## Servidor Docker com IPv4 público

A implantação não depende de um provedor de nuvem. Basta um host compatível com Docker e IPv4 público acessível; não são necessários domínio, registry ou banco gerenciado. Antes de instalar, inspecione sistema, arquitetura, Docker existente, recursos, volumes e ocupação de 80/443. Não remova nginx, Jenkins ou workloads alheios automaticamente.

Reutilize Docker compatível. Se estiver ausente, siga a [instalação oficial da distribuição](https://docs.docker.com/engine/install/). `sudo sh deploy/setup-servidor.sh` é um instalador **opcional para Ubuntu limpo**: instala somente Docker, recusa pacotes/estado conflitantes e não configura aplicações, proxy, Jenkins ou swap. Outros sistemas continuam usando o launcher com seu Docker já instalado.

Firewall/regras de ingresso do provedor: 80/443 públicos; SSH 22 restrito ao CIDR do operador. Não publique 8081/8082/8083, PostgreSQL, 18080 ou o socket Docker. Portas publicadas pelo Docker podem contornar regras UFW; não dependa apenas delas.

Transfira o candidato validado para a arquitetura da instância e seu SHA256 via SSH/SCP. No diretório recebido:

```sh
sha256sum -c <id>.tar.sha256
mkdir supets-release
tar -xf <id>.tar -C supets-release
cd supets-release
sh ./supets.sh deploy <id> --project <projeto-do-pacote> --cloud --ip <ipv4-atribuido> --acme-email <contato>
```

Extraia somente um pacote produzido/aprovado pelo fluxo `release`, após conferir seu checksum de origem confiável. O launcher valida novamente fonte, manifest e imagens antes de carregá-las. Use volumes novos e credenciais geradas no destino; não transfira contas/dados locais de teste. Se a arquitetura for diferente, produza e valide imagens dessa arquitetura antes da transferência.

Caddy solicita primeiro um certificado ACME de staging em armazenamento separado e mantém manutenção. Depois usa Let's Encrypt de produção, perfil `shortlived`, com SAN do IPv4. A abertura exige HTTPS com confiança normal, sem `-k`, certificado interno ou fallback HTTP para credenciais. HTTP redireciona para HTTPS. Certificados IP duram aproximadamente 160 horas; a renovação automática depende de Caddy ativo, portas acessíveis e armazenamento persistente. Configuração de renovação não é prova de renovação natural observada.

O nome TLS padrão é derivado do IPv4 configurado, permitindo selecionar o certificado mesmo quando clientes por IP omitem SNI e o proxy está atrás do NAT do Docker.

Se o IPv4 público mudar, repita `deploy` com `--cloud --ip <novo-ip>`; o contato já salvo pode ser reutilizado. Após parada prolongada, aguarde emissão/validação antes de abrir o serviço. Falha ACME mantém manutenção. A disponibilidade depende do host ativo, da conectividade e da validade dos certificados.

Depois da ativação, valide de fora do servidor: HTTPS confiável, redirecionamento, `/api/ready`, portas internas inacessíveis e fluxos reais cidadão/ONG. Teste persistência, outages, restore e, se habilitado, o job Jenkins. Não reinicie um host com workloads alheios sem autorização.

## Jenkins: trilha separada e privada

```sh
sh ./supets.sh ci-up
```

Administração somente em `http://localhost:18080`; para um servidor remoto, use túnel `ssh -L 18080:127.0.0.1:18080 <usuario>@<ipv4>`. Não libere 18080 nas regras públicas de ingresso. Identifique o container por suas labels `com.supets.project` e serviço `jenkins`. A senha inicial é lida explicitamente no próprio container, em `/var/jenkins_home/secrets/initialAdminPassword`. No wizard, escolha **Select plugins to install → None → Install**: os plugins revisados já estão na imagem. Crie uma conta administrativa privada. Não copie senhas para repositório/relatórios nem atualize plugins fora da lista revisada.

Há um executor com label `supets-docker`, ferramentas e plugins fixados. O socket Docker e o volume de controle compartilhado tornam este nó apropriado apenas para mantenedores/código confiáveis; não execute PRs ou jobs arbitrários.

Para o modo candidato, crie manualmente o Pipeline `supets-candidate`, sem SCM/triggers, com o `Jenkinsfile` revisado. A primeira execução registra os parâmetros declarativos e falha sem um candidato válido; depois use **Build with Parameters**. Coloque o arquivo `<id>.tar` e seu `.tar.sha256` em `incoming/` no workspace do job, legíveis pelo UID1000. Informe `CANDIDATE_ID`, `PROJECT`, `PUBLIC_PORT`, `TARGET_PLATFORM` e `CLOUD` conforme o projeto existente. O job importa, testa imagens congeladas, arquiva JUnit/TAP/evidências e implanta sem rebuild; confira resultado real e readiness, não apenas a sintaxe do Jenkinsfile.

O job `supets-main` fica bloqueado por um interlock administrativo, desabilitado por padrão. Somente após publicação autorizada do código revisado, habilite-o no container com usuário root:

```sh
docker exec --user 0 <container-jenkins> node /opt/supets/deploy/jenkins/approve-main.mjs --enable
```

Use `--disable` para revogar. O repositório/ref autorizado está em `deploy/jenkins/published-main.json`; o job busca a main fixa e registra o SHA efetivamente compilado. A aprovação não autoriza executar outra branch.

Para publicação automática, configure `supets-main` como **Pipeline script from SCM → Git**, URL `https://github.com/CarlosDinizz/proj-lab-eng-software`, branch `*/main`, caminho `Jenkinsfile`, com **GitHub hook trigger for GITScm polling**. Mantenha-o desabilitado até publicar e aprovar a revisão. Os parâmetros padrão vêm de `SUPETS_PROJECT`, `SUPETS_PUBLIC_PORT`, `SUPETS_PLATFORM` e `SUPETS_CLOUD`, encaminhados por `ci-up`; em um controller já existente, configure esses mesmos valores não secretos em **Manage Jenkins → System → Global properties → Environment variables**, antes de habilitar o job. Isso mantém o projeto/porta/plataforma/modo corretos também em pushes sem parâmetros explícitos. O helper registra o SHA da `main` efetivamente buscada e compilada; não há garantia de vínculo ao SHA exato do payload do webhook.

O webhook público fica desabilitado por padrão. Antes de habilitá-lo, em **Manage Jenkins → System → GitHub → Advanced → Add shared secret**, selecione uma credencial **Secret text** de escopo **System** e o algoritmo **SHA-256**. Use o mesmo segredo na configuração do webhook no GitHub, sem incluí-lo no repositório. Valide a rejeição de assinaturas ausentes/incorretas e de corpos alterados, além da aceitação de uma entrega corretamente assinada. Somente `POST /github-webhook/` é encaminhado ao Jenkins privado quando habilitado; páginas administrativas não são publicadas. Verifique a entrega do evento e o resultado do pipeline separadamente.

Contratos e procedimentos de teste: [validação](../docs/validacao.md).
