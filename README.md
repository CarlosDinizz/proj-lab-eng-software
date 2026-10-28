# SuPets

Plataforma de suporte a pets.

## Rodar o gateway localmente

O gateway é um projeto Maven independente em `microsservicos/gateway/`
(Java 21). O `pom.xml`, o wrapper Maven e os diretórios `src/main` e `src/test`
ficam nessa pasta; não há um projeto Maven agregador na raiz.

A partir da raiz do repositório:

```sh
cd microsservicos/gateway
./mvnw clean verify         # compila, testa e gera target/supets-*.jar
./mvnw test                 # só os testes
./mvnw spring-boot:run      # sobe em http://localhost:8081
```

No Windows, use `mvnw.cmd` em vez de `./mvnw`, na mesma pasta.

Community (`microsservicos/community/`, porta 8080) e Ocorrências
(`microsservicos/ocorrencias/`, porta 8082) continuam sendo projetos independentes.
Veja [a documentação do gateway](docs/gateway.md) para as rotas e a configuração
dos endereços dos serviços.

O Jenkinsfile da raiz compila, testa e empacota o gateway nessa nova pasta.
O deploy continua usando `deploy/supets.service` e `/opt/supets/app.jar`.
