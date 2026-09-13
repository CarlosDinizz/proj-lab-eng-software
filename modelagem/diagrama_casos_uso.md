# Diagrama de Casos de Uso

```plantuml
@startuml

left to right direction

actor "Cidadao" as cid
actor "ONG" as ong

rectangle Sistema {
  usecase "Registrar ocorrência" as UC1
  usecase "Visualizar ocorrências" as UC2
  usecase "Atualizar ocorrência" as UC3
  usecase "Participar de campanha" as UC4
  usecase "Registrar campanha" as UC5
  usecase "Visualizar campanhas" as UC6
  usecase "Atualizar campanha" as UC7
}

cid --> UC1
cid --> UC2
cid --> UC3
cid --> UC4
cid --> UC6
ong --> UC2
ong --> UC5
ong --> UC6
ong --> UC7

@enduml
```
