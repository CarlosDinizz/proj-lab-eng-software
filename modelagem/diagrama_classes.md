# Diagrama de Classes de Domínio

```plantuml
@startuml
class Campanha {
}

class TipoCampanha {
}

class StatusCampanha {
}

class ParticipacaoCampanha {
}

class ONG {
}

class Cidadao {
}

class Local {
}

class Estado {
}

class Cidade {
}

class Contato {
}

class Ocorrencia {
}

class StatusOcorrencia {
}

class TipoOcorrencia {
}

class Animal {
}

class SexoAnimal {
}

class Especie {}

class Porte {}




Cidadao "*" --> "*" Ocorrencia : registra

Cidadao "1" --> "*" Contato : possui

Cidadao "*" --> "1" Local : mora

ONG "*" --> "1" Local : possui

ONG "1" --> "*" Contato : possui

ONG "1" --> "*" Campanha : cria

Campanha "*" --> "1" TipoCampanha : possui

Campanha "*" --> "1" StatusCampanha : contém

Ocorrencia "*" --> "1" TipoOcorrencia : possui

Ocorrencia "*" --> "1" StatusOcorrencia : possui

Campanha "1" --> "*" Notificacao : dispara

Ocorrencia "1" --> "*" Notificacao :  dispara 

Contato "*" --> "1" TipoContato : contém

Campanha "*" --> "1" Local : ocorre em

Ocorrencia "*" --> "1" Local : ocorre em

Local "*" --> "1" Estado : possui

Cidade "*" --> "1" Estado : pertence

Ocorrencia "1" --> "1" Animal : envolve

Animal "*" --> "1" Especie : possui

Animal "*" --> "1" Porte : possui

Animal "*" --> "1" SexoAnimal : possui

Cidadao "1" --> "*" ParticipacaoCampanha : realiza

Campanha "1" --> "*" ParticipacaoCampanha : possui


@enduml


```
