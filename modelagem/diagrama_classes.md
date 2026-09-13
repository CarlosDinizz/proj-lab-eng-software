# Diagrama de Classes de Domínio

```plantuml
class Campanha {
}

class TipoCampanha {
}

class StatusCampanha {
}

class ONG {
}

class Cidadao {
}

class Local {
}

class Contato {
}

class Ocorrencia {
}

class StatusOcorrencia {
}

class TipoOcorrencia {
}


Cidadao --> Ocorrencia : registra

Cidadao --> Contato : possui

Cidadao --> Local : mora

ONG --> Local : possui

ONG --> Contato : possui

ONG --> Campanha : cria

Campanha --> TipoCampanha : possui

Campanha --> StatusCampanha : contém

Ocorrencia --> TipoOcorrencia : possui

Ocorrencia --> StatusOcorrencia : possui

Campanha --> Notificacao : registra

Ocorrencia --> Notificacao :  registra 

Contato --> TipoContato : contém

Campanha --> Local : possui

Ocorrencia --> Local : possui

```
