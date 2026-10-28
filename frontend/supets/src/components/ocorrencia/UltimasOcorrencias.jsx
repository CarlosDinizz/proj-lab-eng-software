import { Button, Card, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";

export function UltimasOcorrencias() {
    const [ocorrencias, setOcorrencias] = useState([]);
    const [situacao, setSituacao] = useState("carregando");

    useEffect(() => {
        const controller = new AbortController();
        fetch("/ocorrencia/api/v1", { signal: controller.signal })
            .then((response) => {
                if (!response.ok) throw new Error("Falha ao carregar ocorrências");
                return response.json();
            })
            .then((dados) => {
                setOcorrencias(dados.slice(0, 3));
                setSituacao("pronto");
            })
            .catch((error) => {
                if (error.name !== "AbortError") setSituacao("erro");
            });
        return () => controller.abort();
    }, []);

    return (
        <Flex flexDir="column" gap="2">
            <Text fontWeight="bold" fontSize="3xl">Últimas Ocorrências</Text>
            {situacao === "carregando" && (
                <Flex role="status" align="center" gap="2">
                    <Spinner size="sm" color="purple.solid" aria-hidden="true" />
                    <Text>Carregando ocorrências...</Text>
                </Flex>
            )}
            {situacao === "erro" && <Text>Não foi possível carregar as ocorrências.</Text>}
            {situacao === "pronto" && ocorrencias.length === 0 && <Text>Nenhuma ocorrência encontrada.</Text>}
            <Flex gap="4" align="stretch" wrap="wrap">
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
                                        Local: {ocorrencia.endereco}, {ocorrencia.cidade} - {ocorrencia.estado}
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
