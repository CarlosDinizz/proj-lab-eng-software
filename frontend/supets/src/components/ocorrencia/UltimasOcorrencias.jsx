import { Button, Card, Flex, Stack, Text } from "@chakra-ui/react";

export function UltimasOcorrencias() {
    const ocorrencias = getOcorrencias();

    return (
        <Flex flexDir="column" gap="2" p="8">
            <Text fontWeight="bold" fontSize="3xl">Últimas Ocorrências</Text>
            <Flex gap="4" align="stretch">
                {ocorrencias.map((ocorrencia) =>
                    <Card.Root
                        key={ocorrencia.id}
                        minHeight="13rem"
                        maxWidth="xs"
                        width="full"
                        colorPalette="purple"
                    >
                        <Card.Body
                            display="flex"
                            flexDirection="column"
                            flex="1"
                            width="full"
                        >
                            <Card.Title mb="2">
                                {ocorrencia.titulo}
                            </Card.Title>

                            <Card.Description>
                                {ocorrencia.descricao}
                            </Card.Description>

                            <Card.Footer mt="auto" p="0">
                                <Stack gap="2" align="start">
                                    <Text fontSize="14px" >
                                        Local: {ocorrencia.local}
                                    </Text>

                                    <Button>
                                        Visualizar ocorrência
                                    </Button>
                                </Stack>
                            </Card.Footer>
                        </Card.Body>
                    </Card.Root>
                )}
            </Flex>
        </Flex>
    );
}

function getOcorrencias() {
    return [
        { id: 1, titulo: "Cão abandonado", descricao: "Michael Jackson foi abandonado e é constantemente visto...", local: "Parque Artur Alvim" },
        { id: 2, titulo: "Gato desaparecido", descricao: "Meu gato Joãozinho sumiu no dia 20/11/2026 em...", local: "Praça Higienópolis" },
        { id: 3, titulo: "Leão desaparecido", descricao: "Zé desapareceu do zoológico...", local: "Zoológico Barra Funda" }
    ]
}
