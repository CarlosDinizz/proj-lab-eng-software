@startuml

(*) --> "
{{salt
{^ "Tela Cidadão"
<b>Início
Ocorrências
[Criar] | [Minhas Ocorrências]

Campanhas
[Buscar] | [Participadas]
}
}}
" as inicio

inicio -right-> "
{{salt
{^ "Tela Cidadão"
<b> Criar nova ocorrência
.
Título* | "Insira o título da ocorrência"
Descrição* | {SI 
| Insira a descrição da ocorrência
| .
| "                             "
| }

Data do ocorrido* | "dd/MM/yyyy" | Tipo da ocorrência* . | ^Selecione uma opção^
CEP* | "                    " | Endereço* | "                    "
Cidade* | ^Selecione uma opção^ | Estado* | ^Selecione uma opção^
.
<i>Informações do animal
Nome | "Insira o nome do animal" | Espécie* | ^Selecione uma opção^
Sexo | ^Selecione uma opção^ | Raça | "Insira a raça do animal."
Porte | ^Selecione uma opção^
[Voltar] | [Criar]
}
}}
" as vazio

vazio -down-> "
{{salt
{^ "Tela Cidadão"
<b> Criar nova ocorrência
.
Título* | "Cachorro desaparecido no bairro Moema"
Descrição* | {SI 
| Meu cachorro desapareceu próximo ao Parque
| das Bicicletas. Ele atende pelo nome de Thor
| e estava usando uma coleira azul.
| }

Data do ocorrido* | "13/09/2026" | Tipo da ocorrência* . | ^Desaparecimento^
CEP* | "02141-342                " | Endereço* | "Moema                    "
Cidade* | ^São Paulo^ | Estado* | ^SP^
.
<i>Informações do animal
Nome | "Thor" | Espécie* | ^Cachorro^
Sexo | ^Macho^ | Raça | "Golden retriever"
Porte | ^Grande^
[Voltar] | [Criar]
}
}}
" as preenchida

preenchida -down-> "
{{salt
{^ "Tela Cidadão"

<b> Criar nova ocorrência
.
<color : green> Ocorrência criada com sucesso!
.
[Continuar]
}
}}
" as sucesso

sucesso --> inicio







@enduml