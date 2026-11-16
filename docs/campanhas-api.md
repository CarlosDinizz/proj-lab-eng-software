# API de campanhas (casos de uso 4 a 7)

Campanhas são um módulo do serviço `community` (`com.supets.community.campanha`), ao lado de `cidadao` e `ong`.
O acesso público passa pelo Caddy e pelo gateway, preservando `/community/**`; não é necessário acessar diretamente o serviço.

Todas as rotas exigem login: o gateway valida o token e repassa `X-Usuario-Id` e `X-Usuario-Perfil`.
Erros vêm no formato `{campo: mensagem}`; quando não há um campo específico, a chave é `message`.

Tabelas: `tipo_campanha`, `campanha` e `participacao_campanha` (migration `V4__campanhas.sql`).

## Endpoints

Caminho base pelo gateway: `/community/campanha/api/v1`.

| Método e caminho | Quem | Resposta |
|---|---|---|
| `GET /tipos` | logado | `[{ "id": 1, "nome": "Vacinação" }, ...]` |
| `POST /` | ONG | `201` com a campanha criada (caso de uso 5) |
| `GET /` | logado | Todas; as que não terminaram primeiro (caso de uso 6) |
| `GET /minhas` | ONG | As que a ONG criou |
| `GET /participadas` | cidadão | As que o cidadão participa |
| `GET /{id}` | logado | A campanha; `404` se não existir |
| `PUT /{id}` | ONG dona | A campanha atualizada (caso de uso 7); `403` para outra ONG |
| `POST /{id}/participacoes` | cidadão | `201` (caso de uso 4); `409` se já participa ou se a campanha terminou |

## Corpo do `POST` e do `PUT`

```json
{
  "titulo": "Vacinação Antirrábica",
  "descricao": "Campanha gratuita de vacinação contra a raiva para cães e gatos.",
  "dataInicio": "2026-09-20",
  "dataFim": "2026-09-25",
  "tipoCampanhaId": 1,
  "cep": "23832231",
  "endereco": "Rua das Flores, 150",
  "cidade": "Campinas",
  "estado": "SP"
}
```
As datas acima são ilustrativas. Para criar uma campanha, substitua-as por datas atuais/futuras e obtenha `tipoCampanhaId` em `GET /tipos`.


Regras: todos os campos são obrigatórios; CEP com 8 dígitos; `dataFim` igual ou depois de `dataInicio`;
`dataInicio` não pode estar no passado (na atualização, uma campanha que já começou pode manter a data que tinha).
"Hoje" é calculado em `America/Sao_Paulo` tanto no backend quanto na interface. UF e cidade devem formar um par válido no catálogo IBGE empacotado; valores são normalizados para a grafia canônica. Não há consulta externa durante o cadastro.

## Campanha nas respostas

```json
{
  "id": "uuid",
  "titulo": "Vacinação Antirrábica",
  "descricao": "...",
  "dataInicio": "2026-09-20",
  "dataFim": "2026-09-25",
  "tipoCampanhaId": 1,
  "tipoCampanha": "Vacinação",
  "cep": "23832231",
  "endereco": "Rua das Flores, 150",
  "cidade": "Campinas",
  "estado": "SP",
  "ongId": "uuid",
  "ongNome": "Patas Unidas",
  "participando": false,
  "totalParticipantes": 12
}
```

`participando` diz se o usuário logado participa; `totalParticipantes` é quantos cidadãos participam.

## Concorrência e atualização da interface

A atualização pela ONG e a participação usam o mesmo bloqueio de linha, dentro da transação. Se a atualização encerrar a campanha primeiro, a participação posterior retorna `409` sem criar vínculo. Se a participação vencer, o vínculo permanece mesmo após uma alteração de datas; não há exclusão retroativa.

Um `409` não comprova participação: também pode significar campanha encerrada. A interface mostra a mensagem retornada e recarrega a campanha antes de atualizar os controles. Se essa leitura falhar, mostra indisponibilidade e uma ação de tentar novamente, sem apresentar estado antigo como confirmado.

As listas aceitam os filtros oferecidos pela interface; a busca textual de cidade não é o seletor obrigatório de município usado nos formulários de criação/edição. A participação é exclusiva de cidadãos; criação e edição são exclusivas da ONG proprietária.