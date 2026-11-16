# Implantação Docker atual

Um host Docker executa o gateway, a interface web e os serviços de negócio. `community` reúne cadastro, autenticação e campanhas; `ocorrencias` mantém ocorrências e animais. Cada serviço de negócio possui seu próprio PostgreSQL.

```plantuml
@startuml
node "Navegador" as browser
node "Host Docker\nlocal ou público" as host {
    node "web / Caddy" as web
    node "gateway" as gateway
    node "community\ncidadão, ONG, auth, campanha" as community
    node "ocorrencias" as ocorrencias
    database "community-db\nPostgreSQL 16" as community_db
    database "ocorrencias-db\nPostgreSQL 16" as ocorrencias_db
    node "Jenkins opcional\nadmin em loopback" as jenkins
    storage "Volumes persistentes\nbancos, controle, certificados, assets" as volumes
}
browser --> web : HTTP loopback local\nHTTPS IPv4 público
web --> gateway : HTTP / API
gateway --> community : rede interna
gateway --> ocorrencias : rede interna
community --> community_db : rede privada do banco
ocorrencias --> ocorrencias_db : rede privada do banco
jenkins ..> host : Docker socket\nsomente código confiável
community_db --> volumes
ocorrencias_db --> volumes
web --> volumes
@enduml
```

Somente Caddy publica a aplicação. Jenkins é acessado por loopback/túnel SSH; backends e bancos não publicam portas. As redes, imagens e volumes executáveis estão em [`deploy/docker-compose.yml`](../deploy/docker-compose.yml), com complementos cloud e CI no mesmo diretório.