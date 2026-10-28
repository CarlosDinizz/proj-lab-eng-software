# Gateway de API

O gateway está em `microsservicos/gateway/`, com seu próprio `pom.xml`, wrapper
Maven, `src/main` (incluindo recursos) e `src/test`. Ele continua na porta 8081,
com o artefato `br.mackenzie.lab:supets` e os pacotes Java originais.
Community e Ocorrências permanecem projetos independentes; não há agregador
Maven na raiz.

## Executar

Com Java 21, a partir da raiz do repositório:

```sh
cd microsservicos/gateway
./mvnw clean verify
./mvnw spring-boot:run
```

Para executar apenas os testes, use `./mvnw test` nessa pasta. No Windows,
substitua `./mvnw` por `mvnw.cmd`. O JAR é gerado em
`microsservicos/gateway/target/supets-*.jar` (caminho relativo à raiz).

O Jenkinsfile permanece na raiz e usa esse projeto para compilação, testes,
relatórios JUnit, empacotamento e arquivamento. No deploy, o JAR dessa pasta é
copiado para `/opt/supets/app.jar`; `deploy/supets.service` continua executando
esse arquivo, sem alteração no serviço ou no health check `/api/status`.

## Rotas

O gateway encaminha as requisições sem alterar o caminho:

| Caminho | Serviço | Endereço padrão |
| --- | --- | --- |
| `/cidadao/api/v1/**` e `/ong/api/v1/**` | Community | `http://localhost:8080` |
| `/ocorrencia/api/v1/**` | Ocorrências | `http://localhost:8082` |

Os caminhos base `/cidadao/api/v1`, `/ong/api/v1` e `/ocorrencia/api/v1`
também são encaminhados. O endpoint `/api/status` continua disponível no
gateway. Por exemplo:

```sh
curl http://localhost:8081/cidadao/api/v1/1
curl http://localhost:8081/ocorrencia/api/v1/1
```

Os serviços devem estar em execução. Configure `COMMUNITY_URL` e
`OCORRENCIAS_URL` com os endereços HTTP dos serviços quando estiverem em
outras máquinas ou portas. As URLs devem conter somente esquema, host e porta.
As rotas encaminham requisições; elas não implementam as funcionalidades que
ainda faltam nos serviços.
