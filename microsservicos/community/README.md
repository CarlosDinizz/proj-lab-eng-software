# Serviço Community

Monolito modular com `cidadao`, `ong`, `auth`, `campanha` e componentes `shared`.
Mantém seu próprio PostgreSQL e migrations Flyway; o gateway é a entrada autenticada.

## Executar e testar

Na **raiz do repositório**, use `sh ./supets.sh up` e `sh ./supets.sh verify`.
No Windows, use o launcher PowerShell descrito no [README principal](../../README.md).
Não há Compose local de banco com usuário/senha previsíveis nem necessidade de Maven instalado no host.

O contêiner atende internamente em `community:8083/community`; não publique essa porta.
Os testes exigem o contrato de banco isolado e seu sentinel antes de qualquer migration ou limpeza.
O esquema é gerenciado por Flyway, sem `create-drop` ou atualização automática do Hibernate.
Mapeamentos legados não usados pelos fluxos atuais permanecem preservados; não se exige validação global desses modelos antigos.

Contratos: [gateway/autenticação](../../docs/gateway.md), [campanhas](../../docs/campanhas-api.md).
Operação e segredos: [deploy](../../deploy/README.md). Evidências: [validação](../../docs/validacao.md).
