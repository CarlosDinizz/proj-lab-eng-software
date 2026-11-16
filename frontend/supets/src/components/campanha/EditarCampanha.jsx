import { useRecurso } from "@/shared/useRecurso";
import { Button, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@/auth/useApi";
import { useAuth } from "@/auth/useAuth";
import { FormularioCampanha } from "./FormularioCampanha";
import { API_CAMPANHAS, podeEditar } from "./campanhas";

export function EditarCampanha() {
    const { id } = useParams();
    const api = useApi();
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const recurso = useRecurso(api, `${API_CAMPANHAS}/${id}`);
    const resultado = { campanha: recurso.dados, naoEncontrada: recurso.status === "not-found", erro: recurso.status === "error" };

    if (recurso.status === "loading") {
        return (
            <Flex role="status" justify="center" align="center" gap="2" py="10">
                <Spinner size="sm" color="purple.solid" aria-hidden="true" />
                <Text>Carregando campanha...</Text>
            </Flex>
        );
    }

    const mensagem = resultado.naoEncontrada ? "Campanha não encontrada."
        : resultado.erro ? "Não foi possível carregar a campanha."
        : !podeEditar(resultado.campanha, usuario) ? "Apenas a ONG que criou a campanha pode atualizá-la."
        : null;
    if (mensagem) {
        return (
            <Stack align="center" py="10">
                <Text>{mensagem}</Text>
                {resultado.erro && <Button onClick={recurso.recarregar}>Tentar novamente: campanha</Button>}
                <Button variant="outline" onClick={() => navigate("/campanhas")}>Ver campanhas</Button>
            </Stack>
        );
    }

    return <FormularioCampanha key={resultado.campanha.id} campanha={resultado.campanha} />;
}