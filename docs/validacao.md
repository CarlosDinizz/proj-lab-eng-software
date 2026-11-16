# Testes e contratos

## Testes automatizados

Com Docker disponível, execute na raiz:

```sh
sh ./supets.sh verify
```

No Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File .\supets.ps1 verify`.

O comando compila uma vez, executa testes sobre as classes e imagens congeladas e verifica as APIs em um ambiente descartável. Os testes PostgreSQL usam credenciais, redes e bancos próprios; não recebem a configuração privada do ambiente ativo. Qualquer falha retorna código diferente de zero. JUnit, TAP, logs e resultados ficam em `.supets/<projeto>/reports/`.

| Suíte | Cobertura principal |
| --- | --- |
| Gateway | JWT, cabeçalhos de identidade, autorização, rate limit e readiness |
| Community | Cadastro, documentos, endereços, login, perfis e concorrência de campanhas |
| Ocorrências | Criação/edição/status, autorização, geografia, migrations e bloqueios PostgreSQL |
| Frontend | Sessão, navegação de retorno, validação, calendário e regras de formulários |
| APIs integradas | Caddy → gateway → serviços → PostgreSQL, incluindo persistência e conflitos |

Testes de helpers não substituem a verificação da interface. Para testar um pacote já exportado sem recompilar, use `verify --candidate <id>` no projeto correspondente.

## Fluxos de interface

Use contas e dados fictícios próprios. CPF/CNPJ passam por checksum e unicidade, não por comprovação de identidade. O [README](../README.md) contém exemplos sintéticos; não use documentos ou senhas reais nos testes.

| Área | Procedimento | Resultado esperado |
| --- | --- | --- |
| Cadastro | Criar cidadão e ONG; alternar UF; informar documento inválido e e-mail duplicado | Município acompanha a UF; mensagens específicas; duplicata não cria outra conta |
| Sessão | Entrar, abrir rota protegida, atualizar, sair e entrar novamente | Perfil e permissões corretos; retorno seguro à rota solicitada |
| Navegação | Usar cabeçalho/rodapé por ponteiro e Tab/Enter, em desktop e 390 px | Todos os destinos alcançáveis; Sobre e Cadastro abrem suas páginas |
| Ocorrência | Preencher todos os campos, selecionar ponto no mapa ou aplicar latitude/longitude | Um único registro; detalhe e atualização da página mantêm os dados |
| Edição | Autor edita ocorrência aberta e limpa campos opcionais do animal | Conteúdo atualizado; IDs, autoria e metadados preservados |
| Permissões | Outra conta tenta editar; ONG tenta criar ocorrência | Operação recusada sem gravações parciais |
| Atendimento | Duas contas tentam ajudar a mesma ocorrência; responsável resolve | Um vencedor; perdedor vê estado atualizado; resolução persiste |
| Mapa/lista | Alternar status e raios, incluindo qualquer distância; navegar por teclado | Cards e marcadores correspondem ao filtro atual |
| Campanha | ONG cria/edita; cidadão participa; outra ONG tenta editar | Proprietário autorizado; participação e contagem persistem; edição alheia recusada |
| Conflitos | Participação duplicada ou campanha encerrada | Mensagem do servidor e recarga autoritativa, sem participação fictícia |
| Recuperação | Indisponibilizar leitura de opções e restaurá-la; repetir com tiles/geolocalização | Erro persistente, tentativa explícita e valores do formulário preservados |
| Responsividade | Repetir criação, edição e navegação em viewport estreita | Controles utilizáveis sem navegação cortada |
| Persistência | Executar `down` e `up` com o mesmo projeto e porta | Login, IDs, ocorrências, campanhas e participações preservados |

Em testes de falha no navegador, remova bloqueios/interceptações ao terminar. Uma localização simulada ou resposta interceptada não valida o serviço real. Não injete falhas em um ambiente com usuários ativos.

## API de ocorrências

Base pública: `/ocorrencia/api/v1`. Todas as rotas exigem token válido; obtenha-o no login descrito em [gateway](gateway.md).

| Método/caminho | Contrato |
| --- | --- |
| `GET /tipos`, `/especies`, `/portes`, `/sexos` | Opções válidas para os formulários; não fixe IDs no cliente |
| `POST /` | Cidadão cria ocorrência; retorna `201` e o registro |
| `GET /` | Lista global ou filtrada por status/localização |
| `GET /minhas` | Registros relacionados à identidade autenticada |
| `GET /{uuid}` | Detalhe; ausente retorna `404` |
| `PUT /{uuid}` | Edição completa pelo cidadão autor, somente em `ABERTA` |
| `PATCH /{uuid}/status` | Transição autorizada para `EM_ANDAMENTO` ou `RESOLVIDA` |

Exemplo de corpo para criação/edição; substitua os IDs pelos retornados nas opções e use uma data válida não futura:

```json
{
  "titulo": "Animal encontrado",
  "descricao": "Animal aguardando atendimento no endereço informado.",
  "dataOcorrido": "2026-01-01",
  "tipoOcorrenciaId": 1,
  "cep": "01001000",
  "endereco": "Praça da Sé, 1",
  "cidade": "São Paulo",
  "estado": "SP",
  "lat": -23.5505,
  "lon": -46.6333,
  "animal": {
    "nome": "Rex",
    "especieId": 1,
    "sexoId": 1,
    "porteId": 1,
    "raca": "Sem raça definida"
  }
}
```

A edição preserva ID da ocorrência e do animal, autor, criação, status e responsável. Nome, raça, sexo e porte opcionais podem ser limpos; espécie continua obrigatória. Mudança inválida de referência não grava parcialmente. Duas edições autorizadas simultâneas seguem a última gravação; edição e atendimento são serializados pelo bloqueio da ocorrência. Se o atendimento vencer, a edição retorna `409`.

Para ajudar: `PATCH /{uuid}/status` com `{"status":"EM_ANDAMENTO"}`. Para resolver, use `{"status":"RESOLVIDA"}`; o backend verifica identidade/perfil e as permissões da transição.

Consulta geográfica: `?lat=-23.5505&lon=-46.6333&raioKm=10`. Latitude/longitude devem vir juntas e ser finitas, dentro de ±90/±180. Sem coordenadas e raio, a listagem é global. Com coordenadas e sem raio, o padrão é 10 km; raio informado deve ser maior que zero e no máximo 500 km. Raio sem centro é inválido. O filtro considera antimeridiano/polos e ordena resultados geográficos por distância.

UF e município são validados pelo catálogo IBGE versionado em `shared/data/`; nenhuma consulta externa é necessária para preencher os formulários. Campanhas usam calendário `America/Sao_Paulo`; veja [contrato de campanhas](campanhas-api.md).

## Implantação e CI

Depois de `verify`, use `release` para exportar as imagens verificadas. `verify-deploy` exercita falhas e recuperação em um projeto descartável: readiness, publicação privada, manutenção, rollback compatível, arquivos estáticos anteriores, backup/restauração, bloqueios e rotação de senha. Consulte [operação](../deploy/README.md) para comandos e limites de recuperação.

Jenkins é validado separadamente: imagem/plugins, autenticação administrativa, acesso privado, importação do candidato, testes isolados, hashes antes/depois, JUnit/TAP, ativação e resultado de readiness. O webhook permanece desabilitado até configurar e validar sua autenticação; não é necessário para execução local.

