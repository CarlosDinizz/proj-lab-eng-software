# Gateway de API

O endereço público local é `http://localhost:8180`. Caddy serve a interface e encaminha a API ao gateway; os serviços e bancos não publicam portas no host.

| Caminho público | Destino interno Docker |
| --- | --- |
| `/community/**` | `community:8083`, preservando o caminho |
| `/ocorrencia/api/v1/**` | `ocorrencias:8082`, preservando o caminho |
| `/api/status`, `/api/ready` | Gateway |

`GET /api/status` comprova apenas liveness. `GET /api/ready` retorna `200` com ambos os componentes `UP`, ou `503` quando um backend/banco não está pronto. As rotas internas de readiness não são encaminhadas publicamente.

## Autenticação

Cadastros e login são públicos:

- `POST /community/cidadao/api/v1`
- `POST /community/ong/api/v1`
- `POST /community/auth/api/v1/login`

As demais operações exigem `Authorization: Bearer <token>`, exceto a consulta pública de ONG. O gateway valida assinatura HS256, emissor, validade, UUID e perfil. Remove cabeçalhos `X-Usuario-*` enviados pelo cliente e gera a identidade confiável dos serviços. Um `403` não encerra a sessão; um `401` exige novo login.

Consultas de perfil usam **UUID**, não identificadores inteiros:

| Operação | Acesso | Resposta |
| --- | --- | --- |
| `GET /community/cidadao/api/v1/{uuid}` | Autenticado | Somente `id`, `nome`, `perfil` |
| `GET /community/ong/api/v1/{uuid}` | Público | Somente `id`, `nome`, `perfil` |

UUID desconhecido retorna `404`; formato inválido, `400`. Documentos, e-mail, endereço e hash de senha não fazem parte dessas respostas.

## Limites e operação

- Corpo de API limitado a 64 KiB no Caddy; excesso retorna `413`.
- Login: 120 tentativas/minuto por IP; cadastros: 60/minuto por IP, compartilhados entre perfis. Excesso retorna `429` com `Retry-After`.
- A contagem é local à instância, não um bloqueio de conta. Caddy substitui o cabeçalho de IP; o gateway não tem entrada pública direta.
- Erros de domínio usam `{ "message": "..." }` ou um mapa de campos e mensagens.
- `JWT_SECRET` é compartilhado apenas por community/gateway e gerado pelo launcher. Não há chave de desenvolvimento utilizável em produção.

```sh
curl --fail http://localhost:8180/api/ready
sh ./supets.sh logs gateway
```

Contratos adicionais: [campanhas](campanhas-api.md), [ocorrências e validação](validacao.md), [operação Docker](../deploy/README.md).
