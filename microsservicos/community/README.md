# Serviço Community


# Arquitetura
O serviço Community segue a arquitetura de monolito modular.

## Migrations
Para criação, alteração e outros métodos para as entidades no banco, é necessário a criação de arquivos migrations.
Para mais informações, clique [aqui](https://www.baeldung.com/database-migrations-with-flyway)

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

