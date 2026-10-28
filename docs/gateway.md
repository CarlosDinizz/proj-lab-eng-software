# Gateway de API

O gateway fica em `microsservicos/gateway/` e atende na porta 8081.
Encaminha as requisições sem alterar o caminho:

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
