# Serviço Ocorrências

Monolito modular para ocorrências, animais, localização e transições de atendimento.
Mantém PostgreSQL próprio, Flyway e contrato de identidade recebido exclusivamente do gateway.

## Executar e testar

Na **raiz do repositório**, use `sh ./supets.sh up` e `sh ./supets.sh verify`.
No Windows, use o launcher PowerShell do [README principal](../../README.md).
O contêiner atende internamente em `ocorrencias:8082`; a porta e o banco não são publicados.

Os testes existentes usam H2 com propriedades fixadas. Testes separados de migrations e concorrência usam PostgreSQL descartável com sentinel, sem acesso aos bancos da aplicação.
O guard de migrations aceita instalação vazia ou histórico V1–V4 completo conhecido (com V5 opcional). Esquemas antigos incompletos, divergentes ou desconhecidos são bloqueados **sem apagar dados**.
Não reescreva V1–V4, não use `repair`/baseline para contornar o bloqueio e não invente autores/animais/localizações de registros antigos.

API de criação, edição completa e status: [validação/contratos](../../docs/validacao.md).
Deploy/backup: [operação](../../deploy/README.md).
