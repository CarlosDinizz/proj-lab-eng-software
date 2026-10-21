# Serviço Community

# Sumário

- [Arquitetura](#arquitetura)
- [Migrations](#migrations)
- [Documentação API](#documentação-api)
- [Requisitos](#requisitos)
- [Como executar?](#como-executar)

## Arquitetura
O serviço Community segue a arquitetura de monolito modular.

Isto quer dizer que este serviço é dividido por módulos:
- ONG
- Cidadão

```
├───src
│   ├───main
│   │   ├───java
│   │   │   └───com
│   │   │       └───supets
│   │   │           └───community
│   │   │               ├───cidadao
│   │   │               │   ├───controller
│   │   │               │   ├───model
│   │   │               │   ├───repository
│   │   │               │   └───service
│   │   │               │       └───impl
│   │   │               ├───ong
│   │   │               │   ├───controller
│   │   │               │   ├───model
│   │   │               │   ├───repository
│   │   │               │   └───service
│   │   │               │       └───impl
│   │   │               └───shared
│   │   └───resources
│   │       ├───db
│   │       │   └───migration
│   │       ├───static
│   │       └───templates
│   └───test
│       └───java
│           └───com
│               └───supets
│                   └───community
└───target
├───classes
│   └───com
│       └───supets
│           └───community
│               ├───cidadao
│               │   ├───controller
│               │   ├───model
│               │   ├───repository
│               │   └───service
│               │       └───impl
│               └───ong
│                   ├───controller
│                   ├───model
│                   ├───repository
│                   └───service
│                       └───impl
```

## Migrations
Para criação, alteração e outros métodos para as entidades no banco, é necessário a criação de arquivos migrations.
Para mais informações, clique [aqui](https://www.baeldung.com/database-migrations-with-flyway)

## Documentação API
A documentação dos endpoints dessa API podem ser acessadas através do Swagger.

Abra seu navegador e digite:
<http://URL_SERVICO:8080/swagger-ui/index.html>

Substitua `URL_SERVICO` por localhost se não estiver executando o serviço pelo container.

## Requisitos

- Java  21
- Maven
- PostgreSQL 16.3

## Como executar?
Primeiramente é necessário que o banco ``community_db`` esteja em execução.

Veja executando:
```bash
docker ps
```

Caso não esteja, execute o docker-compose.yml:
```bash
docker compose up -d
```

Após isso, execute a aplicação Spring Boot:
```bash
mvn clean install
```

```bash
mvn spring-boot:run
```

