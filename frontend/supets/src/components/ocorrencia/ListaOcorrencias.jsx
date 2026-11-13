import { useEffect, useState } from "react";
import { Button, Field, Flex, HStack, NativeSelect, Spinner, Stack, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useApi } from "@/auth/useApi";
import { useAuth } from "@/auth/useAuth";
import { Layout } from "@/components/layout/Layout";
import { CartaoOcorrencia } from "./CartaoOcorrencia";
import { MapaOcorrencias } from "./Mapa";
import { useLocalizacao } from "./useLocalizacao";
import { CENTRO_PADRAO, STATUS, caminhoDaLista, distanciaKm } from "./ocorrencias";

const RAIOS = [5, 10, 25, 50];

/**
 * UC003: Visualizar ocorrências — mapa com as ocorrências próximas e a lista abaixo.
 * Com `minhas`, mostra as que o usuário registrou ou assumiu ("Minhas Ocorrências" do wireframe).
 */
export function ListaOcorrencias({ minhas = false }) {
    const api = useApi();
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const localizacao = useLocalizacao();
    const { pedir } = localizacao;
    const [status, setStatus] = useState("");
    const [raioKm, setRaioKm] = useState(10);
    // Guarda junto o caminho buscado: se o filtro mudou e o caminho é outro, ainda está carregando
    const [resultado, setResultado] = useState(null);

    // Ao abrir, pede a localização para mostrar o que está perto
    useEffect(() => {
        if (!minhas) pedir();
    }, [minhas, pedir]);

    const esperandoLocal = !minhas && (localizacao.situacao === "inicial" || localizacao.situacao === "buscando");
    const caminho = caminhoDaLista({ minhas, status, local: localizacao.local, raioKm });

    useEffect(() => {
        if (esperandoLocal) return;
        const controller = new AbortController();
        api(caminho, { signal: controller.signal })
            .then((resposta) => {
                if (!resposta.ok) throw new Error();
                return resposta.json();
            })
            .then((ocorrencias) => setResultado({ caminho, ocorrencias }))
            .catch((error) => {
                if (error.name !== "AbortError") setResultado({ caminho, erro: true });
            });
        return () => controller.abort();
    }, [api, caminho, esperandoLocal]);

    const carregando = esperandoLocal || resultado?.caminho !== caminho;
    // Em "Minhas", o filtro de status é feito aqui mesmo
    const ocorrencias = (resultado?.ocorrencias ?? []).filter((o) => !minhas || !status || o.status === status);
    const centro = localizacao.local ?? ocorrencias[0] ?? CENTRO_PADRAO;

    function etiqueta(ocorrencia) {
        if (!minhas) return null;
        return ocorrencia.cidadaoId === usuario.id ? "Registrada por você" : "Você está ajudando";
    }

    return (
        <Layout>
            <Stack gap="4">
                <Flex justify="space-between" align="center" wrap="wrap" gap="2">
                    <Text fontWeight="bold" fontSize="3xl">{minhas ? "Minhas ocorrências" : "Ocorrências próximas"}</Text>
                    <HStack>
                        <Button variant={minhas ? "outline" : "solid"} colorPalette="purple" onClick={() => navigate("/ocorrencias")}>Todas</Button>
                        <Button variant={minhas ? "solid" : "outline"} colorPalette="purple" onClick={() => navigate("/ocorrencias/minhas")}>Minhas</Button>
                        {usuario.perfil === "CIDADAO" && (
                            <Button colorPalette="orange" onClick={() => navigate("/ocorrencias/nova")}>Criar</Button>
                        )}
                    </HStack>
                </Flex>

                <HStack align="end" wrap="wrap">
                    <Field.Root maxW="xs">
                        <Field.Label>Status</Field.Label>
                        <NativeSelect.Root>
                            <NativeSelect.Field value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="">Todos</option>
                                {Object.entries(STATUS).map(([valor, { texto }]) => <option key={valor} value={valor}>{texto}</option>)}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    </Field.Root>
                    {!minhas && localizacao.local && (
                        <Field.Root maxW="xs">
                            <Field.Label>Distância</Field.Label>
                            <NativeSelect.Root>
                                <NativeSelect.Field value={raioKm ?? ""} onChange={(e) => setRaioKm(e.target.value ? Number(e.target.value) : null)}>
                                    {RAIOS.map((km) => <option key={km} value={km}>Até {km} km</option>)}
                                    <option value="">Qualquer distância</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field.Root>
                    )}
                </HStack>
                {!minhas && (localizacao.situacao === "negada" || localizacao.situacao === "indisponivel") && (
                    <Text fontSize="sm">
                        Não conseguimos sua localização, então mostramos todas as ocorrências.{" "}
                        <Button size="xs" variant="outline" onClick={() => pedir()}>Tentar de novo</Button>
                    </Text>
                )}

                <MapaOcorrencias ocorrencias={ocorrencias} centro={centro} voceEstaAqui={localizacao.local} />

                {carregando && (
                    <Flex role="status" align="center" gap="2">
                        <Spinner size="sm" color="purple.solid" aria-hidden="true" />
                        <Text>Carregando ocorrências...</Text>
                    </Flex>
                )}
                {!carregando && resultado?.erro && <Text>Não foi possível carregar as ocorrências.</Text>}
                {!carregando && !resultado?.erro && ocorrencias.length === 0 && <Text>Nenhuma ocorrência encontrada.</Text>}
                <Flex gap="4" align="stretch" wrap="wrap">
                    {!carregando && ocorrencias.map((ocorrencia) => (
                        <CartaoOcorrencia key={ocorrencia.id} ocorrencia={ocorrencia} etiqueta={etiqueta(ocorrencia)}
                            distanciaKm={localizacao.local ? distanciaKm(localizacao.local, ocorrencia) : null} />
                    ))}
                </Flex>
            </Stack>
        </Layout>
    );
}
