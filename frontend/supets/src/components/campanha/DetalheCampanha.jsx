import { useEffect, useRef, useState } from "react";
import { Badge, Box, Button, Card, Flex, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";
import { useApi } from "@/auth/useApi";
import { useAuth } from "@/auth/useAuth";
import { formatarCep, formatarData } from "@/components/ocorrencia/ocorrencias";
import { API_CAMPANHAS, podeEditar, podeParticipar, situacao } from "./campanhas";

export function DetalheCampanha() {
    const { id } = useParams();
    return <ConteudoCampanha key={id} id={id} />;
}

function ConteudoCampanha({ id }) {
    const api = useApi();
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const [resultado, setResultado] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const pendente = useRef(false);
    const [tentativa, setTentativa] = useState(0);
    const ativa = useRef(true);
    useEffect(() => { ativa.current = true; return () => { ativa.current = false; }; }, []);

    useEffect(() => {
        const controller = new AbortController();
        setResultado(null);
        api(`${API_CAMPANHAS}/${id}`, { signal: controller.signal })
            .then(async (resposta) => {
                if (resposta.status === 404) { if (!controller.signal.aborted) setResultado({ id, naoEncontrada: true }); return; }
                if (!resposta.ok) throw new Error();
                const campanha = await resposta.json();
                if (!controller.signal.aborted) setResultado({ id, campanha });
            })
            .catch((error) => {
                if (!controller.signal.aborted) setResultado({ id, erro: true });
            });
        return () => controller.abort();
    }, [api, id, tentativa]);

    async function participar() {
        if (pendente.current) return;
        pendente.current = true;
        setEnviando(true);
        try {
            const resposta = await api(`${API_CAMPANHAS}/${id}/participacoes`, { method: "POST" });
            if (resposta.ok) {
                const campanha = await resposta.json();
                if (!ativa.current) return;
                setResultado({ id, campanha });
                toaster.create({ title: "Participação registrada com sucesso!", type: "success" });
                return;
            }
            if (resposta.status === 401) return;
            if (resposta.status === 409) {
                const corpo = await resposta.json().catch(() => ({}));
                if (!ativa.current) return;
                toaster.create({ title: corpo.message ?? "Não foi possível participar.", type: "info" });
                // Nunca deduz participação a partir de 409: consulta a fonte de verdade.
                setResultado(null);
                try {
                    const atual = await api(`${API_CAMPANHAS}/${id}`);
                    if (atual.status === 404) { if (ativa.current) setResultado({ id, naoEncontrada: true }); return; }
                    if (!atual.ok) throw new Error();
                    const campanha = await atual.json();
                    if (ativa.current) setResultado({ id, campanha });
                } catch { if (ativa.current) setResultado({ id, erro: true }); }
                return;
            }
            const corpo = await resposta.json().catch(() => ({}));
            throw new Error(corpo.message ?? "Tente novamente.");
        } catch (error) {
            if (ativa.current) toaster.create({ title: "Não foi possível registrar a participação", description: error.message, type: "error" });
        } finally {
            pendente.current = false;
            if (ativa.current) setEnviando(false);
        }
    }


    if (resultado?.id !== id) {
        return (
            <Flex role="status" justify="center" align="center" gap="2" py="10">
                <Spinner size="sm" color="purple.solid" aria-hidden="true" />
                <Text>Carregando campanha...</Text>
            </Flex>
        );
    }
    if (resultado.naoEncontrada || resultado.erro) {
        return (
            <Stack align="center" py="10">
                <Text>{resultado.naoEncontrada ? "Campanha não encontrada." : "Não foi possível carregar a campanha."}</Text>
                {resultado.erro && <Button onClick={() => setTentativa((n) => n + 1)}>Tentar novamente: campanha</Button>}
                <Button variant="outline" onClick={() => navigate("/campanhas")}>Ver campanhas</Button>
            </Stack>
        );
    }

    const c = resultado.campanha;
    const { texto, cor } = situacao(c);
    const linha = (rotulo, valor) => valor && (
        <Text><Text as="span" fontWeight="medium">{rotulo}:</Text> {valor}</Text>
    );

    return (
        <Box display="flex" justifyContent="center" py="10" px="4">
            <Card.Root maxWidth="3xl" width="full">
                <Card.Header>
                    <HStack wrap="wrap">
                        <Badge colorPalette={cor}>{texto}</Badge>
                        {c.tipoCampanha && <Badge variant="outline">{c.tipoCampanha}</Badge>}
                    </HStack>
                    <Card.Title>{c.titulo}</Card.Title>
                </Card.Header>
                <Card.Body>
                    <Stack gap="3">
                        <Text whiteSpace="pre-line">{c.descricao}</Text>
                        <HStack gap="6" wrap="wrap">
                            {linha("Data de início", formatarData(c.dataInicio))}
                            {linha("Data de fim", formatarData(c.dataFim))}
                        </HStack>
                        {linha("Tipo da campanha", c.tipoCampanha)}
                        {linha("CEP", c.cep && formatarCep(c.cep))}
                        {linha("Endereço", c.endereco)}
                        {linha("Estado", c.estado)}
                        {linha("Cidade", c.cidade)}
                        {linha("Organizada por", c.ongNome)}
                        {podeEditar(c, usuario) && linha("Participantes", String(c.totalParticipantes ?? 0))}
                        {c.participando && <Text color="green.600" fontWeight="medium">Você participa desta campanha.</Text>}
                    </Stack>
                </Card.Body>
                <Card.Footer colorPalette="orange" justifyContent="space-between">
                    <Button variant="outline" onClick={() => navigate(-1)} disabled={enviando}>Voltar</Button>
                    {podeParticipar(c, usuario) && (
                        <Button onClick={participar} disabled={enviando}>{enviando ? "Enviando..." : "Participar"}</Button>
                    )}
                    {podeEditar(c, usuario) && (
                        <Button disabled={enviando} onClick={() => navigate(`/campanhas/${c.id}/editar`)}>Editar</Button>
                    )}
                </Card.Footer>
            </Card.Root>
        </Box>
    );
}