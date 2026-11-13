import { Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "@/auth/useApi";
import { useAuth } from "@/auth/useAuth";
import { CartaoOcorrencia } from "./CartaoOcorrencia";

export function UltimasOcorrencias() {
    const { usuario } = useAuth();
    const navigate = useNavigate();

    return (
        <Flex flexDir="column" gap="2">
            <Text fontWeight="bold" fontSize="3xl">Últimas Ocorrências</Text>
            {usuario ? <ListaUltimas /> : (
                // UC003: para ver ocorrências é preciso estar autenticado
                <Flex align="center" gap="3" wrap="wrap">
                    <Text>Entre na sua conta para ver as ocorrências perto de você.</Text>
                    <Button colorPalette="purple" onClick={() => navigate("/login", { state: { de: "/ocorrencias" } })}>Fazer login</Button>
                </Flex>
            )}
        </Flex>
    );
}

function ListaUltimas() {
    const api = useApi();
    const [ocorrencias, setOcorrencias] = useState([]);
    const [situacao, setSituacao] = useState("carregando");

    useEffect(() => {
        const controller = new AbortController();
        api("/ocorrencia/api/v1", { signal: controller.signal })
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
    }, [api]);

    return (
        <>
            {situacao === "carregando" && (
                <Flex role="status" align="center" gap="2">
                    <Spinner size="sm" color="purple.solid" aria-hidden="true" />
                    <Text>Carregando ocorrências...</Text>
                </Flex>
            )}
            {situacao === "erro" && <Text>Não foi possível carregar as ocorrências.</Text>}
            {situacao === "pronto" && ocorrencias.length === 0 && <Text>Nenhuma ocorrência encontrada.</Text>}
            <Flex gap="4" align="stretch" wrap="wrap">
                {ocorrencias.map((ocorrencia) => <CartaoOcorrencia key={ocorrencia.id} ocorrencia={ocorrencia} />)}
            </Flex>
        </>
    );
}
