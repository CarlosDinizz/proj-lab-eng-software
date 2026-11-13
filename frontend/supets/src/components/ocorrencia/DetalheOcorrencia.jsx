import { useEffect, useState } from "react";
import { Badge, Box, Button, Card, Flex, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";
import { useApi } from "@/auth/useApi";
import { useAuth } from "@/auth/useAuth";
import { MapaPonto } from "./Mapa";
import { STATUS, acoesPermitidas, formatarData } from "./ocorrencias";

/** UC002: Atualizar ocorrência — mostra os detalhes e deixa assumir ou marcar como resolvida. */
export function DetalheOcorrencia() {
    const { id } = useParams();
    const api = useApi();
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const [resultado, setResultado] = useState(null);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        api(`/ocorrencia/api/v1/${id}`, { signal: controller.signal })
            .then(async (resposta) => {
                if (resposta.status === 404) return setResultado({ id, naoEncontrada: true });
                if (!resposta.ok) throw new Error();
                setResultado({ id, ocorrencia: await resposta.json() });
            })
            .catch((error) => {
                if (error.name !== "AbortError") setResultado({ id, erro: true });
            });
        return () => controller.abort();
    }, [api, id]);

    async function mudarStatus(novoStatus, mensagemDeSucesso) {
        if (enviando) return;
        setEnviando(true);
        try {
            const resposta = await api(`/ocorrencia/api/v1/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: novoStatus }),
            });
            if (resposta.status === 401) return; // o useApi já desloga e manda para o login
            const corpo = await resposta.json().catch(() => ({}));
            if (!resposta.ok) throw new Error(corpo.message ?? "Tente novamente.");
            setResultado({ id, ocorrencia: corpo });
            toaster.create({ title: mensagemDeSucesso, type: "success" });
        } catch (error) {
            toaster.create({ title: "Não foi possível atualizar a ocorrência", description: error.message, type: "error" });
        } finally {
            setEnviando(false);
        }
    }

    if (resultado?.id !== id) {
        return (
            <Flex role="status" justify="center" align="center" gap="2" py="10">
                <Spinner size="sm" color="purple.solid" aria-hidden="true" />
                <Text>Carregando ocorrência...</Text>
            </Flex>
        );
    }
    if (resultado.naoEncontrada || resultado.erro) {
        return (
            <Stack align="center" py="10">
                <Text>{resultado.naoEncontrada ? "Ocorrência não encontrada." : "Não foi possível carregar a ocorrência."}</Text>
                <Button variant="outline" onClick={() => navigate("/ocorrencias")}>Ver ocorrências</Button>
            </Stack>
        );
    }

    const o = resultado.ocorrencia;
    const status = STATUS[o.status];
    const acoes = acoesPermitidas(o, usuario);
    const quem = (idPessoa, perfil) => (idPessoa === usuario.id ? "Você" : perfil === "ONG" ? "Uma ONG" : "Um cidadão");
    const linha = (rotulo, valor) => valor && (
        <Text><Text as="span" fontWeight="medium">{rotulo}:</Text> {valor}</Text>
    );

    return (
        <Box display="flex" justifyContent="center" py="10" px="4">
            <Card.Root maxWidth="3xl" width="full">
                <Card.Header>
                    <HStack wrap="wrap">
                        <Badge colorPalette={status?.cor}>{status?.texto}</Badge>
                        <Badge variant="outline">{o.tipoOcorrencia}</Badge>
                    </HStack>
                    <Card.Title>{o.titulo}</Card.Title>
                </Card.Header>
                <Card.Body>
                    <Stack gap="3">
                        <Text whiteSpace="pre-line">{o.descricao}</Text>
                        {linha("Data do ocorrido", formatarData(o.dataOcorrido))}
                        {linha("Endereço", `${o.endereco}, ${o.cidade} - ${o.estado} · CEP ${o.cep.slice(0, 5)}-${o.cep.slice(5)}`)}
                        <MapaPonto ponto={o} status={o.status} />

                        <Text fontStyle="italic" fontWeight="medium" pt="2">Informações do animal</Text>
                        {linha("Espécie", o.animal.especie)}
                        {linha("Nome", o.animal.nome)}
                        {linha("Sexo", o.animal.sexo)}
                        {linha("Raça", o.animal.raca)}
                        {linha("Porte", o.animal.porte)}

                        <Text fontStyle="italic" fontWeight="medium" pt="2">Acompanhamento</Text>
                        {linha("Registrada por", quem(o.cidadaoId, "CIDADAO"))}
                        {linha("Responsável", o.responsavelId ? quem(o.responsavelId, o.responsavelPerfil) : "Ninguém assumiu ainda")}
                    </Stack>
                </Card.Body>
                <Card.Footer colorPalette="orange" justifyContent="space-between" flexWrap="wrap" gap="2">
                    <Button variant="outline" onClick={() => navigate(-1)} disabled={enviando}>Voltar</Button>
                    <HStack>
                        {acoes.assumir && (
                            <Button colorPalette="purple" disabled={enviando}
                                onClick={() => mudarStatus("EM_ANDAMENTO", "Você assumiu a ocorrência. Obrigado por ajudar!")}>
                                Vou ajudar
                            </Button>
                        )}
                        {acoes.resolver && (
                            <Button colorPalette="green" disabled={enviando}
                                onClick={() => mudarStatus("RESOLVIDA", "Ocorrência marcada como resolvida.")}>
                                Marcar como resolvida
                            </Button>
                        )}
                    </HStack>
                </Card.Footer>
            </Card.Root>
        </Box>
    );
}
