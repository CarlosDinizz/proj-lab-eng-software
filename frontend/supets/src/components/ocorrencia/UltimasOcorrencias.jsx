import { Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useApi } from "@/auth/useApi";
import { useAuth } from "@/auth/useAuth";
import { CartaoOcorrencia } from "./CartaoOcorrencia";
import { useRecurso } from "@/shared/useRecurso";

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
    const recurso = useRecurso(api, "/ocorrencia/api/v1");
    const ocorrencias = (recurso.dados ?? []).slice(0, 3);

    return (
        <>
            {recurso.status === "loading" && (
                <Flex role="status" align="center" gap="2">
                    <Spinner size="sm" color="purple.solid" aria-hidden="true" />
                    <Text>Carregando ocorrências...</Text>
                </Flex>
            )}
            {recurso.status === "error" && <><Text>Não foi possível carregar as ocorrências.</Text><Button onClick={recurso.recarregar}>Tentar novamente: últimas ocorrências</Button></>}
            {recurso.status === "not-found" && <Text>Lista não encontrada.</Text>}
            {recurso.status === "ready" && ocorrencias.length === 0 && <Text>Nenhuma ocorrência encontrada.</Text>}
            <Flex gap="4" align="stretch" wrap="wrap">
                {ocorrencias.map((ocorrencia) => <CartaoOcorrencia key={ocorrencia.id} ocorrencia={ocorrencia} />)}
            </Flex>
        </>
    );
}
