# Tecnologias e pendências

Versões exatas: `pom.xml` de cada serviço e `frontend/supets/package.json`.

## Tecnologias

### Backend (`microsservicos/`)

- Java 21, Maven (wrapper `mvnw`).
- Spring Boot 4 em `community` e `ocorrencias`; Spring Boot 3.5 no `gateway`.
- Spring Cloud Gateway (Server WebMVC) no `gateway`, porta 8081.
- Spring Web MVC, Spring Data JPA, Bean Validation.
- Spring Modulith: cada serviço é um monolito modular.
- Flyway para migrations.
- PostgreSQL 16, via Docker Compose (um banco por serviço).
- H2 nos testes de `ocorrencias`.
- springdoc-openapi (Swagger UI).
- Lombok.
- Spring Security Crypto (hash de senha) em `community`.
- JUnit 5 e Spring Boot Test.

### Frontend (`frontend/supets/`)

- React 19, Vite.
- Chakra UI 3, Emotion, next-themes, react-icons.
- React Router 7.
- Tailwind CSS 3, PostCSS, Autoprefixer.
- ESLint; testes com `node --test`.

### Infra

- Jenkins (`Jenkinsfile`): build, teste, empacotamento e deploy.
- AWS EC2, serviço systemd (`deploy/`).
- Modelagem em PlantUML (`modelagem/`).

## Pendências

### Funcionalidades

- [ ] Serviço de campanhas: registrar, visualizar, atualizar e participar (casos de uso 4 a 7).
- [ ] Login de cidadão e ONG: a tela existe, sem integração com o backend.
- [ ] Autenticação e autorização nas rotas.
- [ ] Atualizar ocorrência além do status (caso de uso 3).
- [ ] Telas de criar ocorrência, minhas ocorrências e campanhas, conforme `modelagem/wireframes/`.
- [ ] Mensageria com RabbitMQ entre serviços, conforme `modelagem/implantacao.md`.

### Infra e qualidade

- [ ] Pipeline do Jenkins para `community`, `ocorrencias` e frontend; hoje só cobre o `gateway`.
- [ ] Imagens Docker dos serviços, conforme o diagrama de implantação.
- [ ] Deploy de `community`, `ocorrencias`, bancos e frontend na AWS.
- [ ] Retirar `microsservicos/ocorrencias/.env` do Git; manter só o `.env.example`.
- [ ] Testes do frontend além da configuração do Vite.
