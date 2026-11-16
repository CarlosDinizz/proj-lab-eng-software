import { useEffect, useState } from "react";
import { Badge, Button, Field, Flex, HStack, Input, NativeSelect, Spinner, Stack, Table, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useApi } from "@/auth/useApi";
import { useAuth } from "@/auth/useAuth";
import { Layout } from "@/components/layout/Layout";
import { ESTADOS, formatarData } from "@/components/ocorrencia/ocorrencias";
import { LISTAS, filtrarCampanhas, situacao } from "./campanhas";

export function ListaCampanhas({ lista = "todas" }) {
    const api = useApi();
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const { titulo, caminho, vazia } = LISTAS[lista];
    const [filtro, setFiltro] = useState({ busca: "", estado: "", cidade: "" });
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        api(caminho, { signal: controller.signal })
            .then((resposta) => {
                if (!resposta.ok) throw new Error();
                return resposta.json();
            })
            .then((campanhas) => setResultado({ caminho, campanhas }))
            .catch((error) => {
                if (error.name !== "AbortError") setResultado({ caminho, erro: true });
            });
        return () => controller.abort();
    }, [api, caminho]);

    const carregando = resultado?.caminho !== caminho;
    const todas = resultado?.campanhas ?? [];
    const campanhas = filtrarCampanhas(todas, filtro);
    const mudarFiltro = (event) => setFiltro((anterior) => ({ ...anterior, [event.target.name]: event.target.value }));

    return (
        <Layout>
            <Stack gap="4">
                <Flex justify="space-between" align="center" wrap="wrap" gap="2">
                    <Text fontWeight="bold" fontSize="3xl">{titulo}</Text>
                    <HStack wrap="wrap">
                        <Button variant={lista === "todas" ? "solid" : "outline"} colorPalette="purple"
                            onClick={() => navigate("/campanhas")}>Todas</Button>
                        {usuario.perfil === "ONG" && (
                            <>
                                <Button variant={lista === "minhas" ? "solid" : "outline"} colorPalette="purple"
                                    onClick={() => navigate("/campanhas/minhas")}>Minhas</Button>
                                <Button colorPalette="orange" onClick={() => navigate("/campanhas/nova")}>Criar</Button>
                            </>
                        )}
                        {usuario.perfil === "CIDADAO" && (
                            <Button variant={lista === "participadas" ? "solid" : "outline"} colorPalette="purple"
                                onClick={() => navigate("/campanhas/participadas")}>Participadas</Button>
                        )}
                    </HStack>
                </Flex>

                <HStack align="end" wrap="wrap">
                    <Field.Root maxW="xs">
                        <Field.Label>Título</Field.Label>
                        <Input name="busca" value={filtro.busca} onChange={mudarFiltro} placeholder="Ex.: vacinação" />
                    </Field.Root>
                    <Field.Root maxW="40">
                        <Field.Label>Estado</Field.Label>
                        <NativeSelect.Root>
                            <NativeSelect.Field name="estado" value={filtro.estado} onChange={mudarFiltro}>
                                <option value="">Todos</option>
                                {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root maxW="xs">
                        <Field.Label>Cidade</Field.Label>
                        <Input name="cidade" value={filtro.cidade} onChange={mudarFiltro} placeholder="Ex.: Campinas" />
                    </Field.Root>
                </HStack>

                {carregando && (
                    <Flex role="status" align="center" gap="2">
                        <Spinner size="sm" color="purple.solid" aria-hidden="true" />
                        <Text>Carregando campanhas...</Text>
                    </Flex>
                )}
                {!carregando && resultado.erro && <Text>Não foi possível carregar as campanhas.</Text>}
                {!carregando && !resultado.erro && todas.length === 0 && <Text>{vazia}</Text>}
                {!carregando && !resultado.erro && todas.length > 0 && (
                    <>
                        <Table.ScrollArea borderWidth="1px" rounded="md">
                            <Table.Root size="sm" interactive>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Título</Table.ColumnHeader>
                                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                        <Table.ColumnHeader>Cidade</Table.ColumnHeader>
                                        <Table.ColumnHeader>Data</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end">Ação</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {campanhas.map((campanha) => {
                                        const { texto, cor } = situacao(campanha);
                                        return (
                                            <Table.Row key={campanha.id}>
                                                <Table.Cell>
                                                    <HStack wrap="wrap">
                                                        <Text>{campanha.titulo}</Text>
                                                        <Badge colorPalette={cor} size="sm">{texto}</Badge>
                                                    </HStack>
                                                </Table.Cell>
                                                <Table.Cell>{campanha.estado}</Table.Cell>
                                                <Table.Cell>{campanha.cidade}</Table.Cell>
                                                <Table.Cell>{formatarData(campanha.dataInicio)}</Table.Cell>
                                                <Table.Cell textAlign="end">
                                                    <Button size="xs" colorPalette="purple" variant="outline"
                                                        onClick={() => navigate(`/campanhas/${campanha.id}`)}>
                                                        Visualizar
                                                    </Button>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table.Root>
                        </Table.ScrollArea>
                        <Text fontSize="sm">Mostrando {campanhas.length} de {todas.length}</Text>
                    </>
                )}

                <HStack>
                    <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
                </HStack>
            </Stack>
        </Layout>
    );
}