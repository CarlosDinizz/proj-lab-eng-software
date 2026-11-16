import { Button, Stack, Text } from "@chakra-ui/react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "@/auth/useApi";
import { useAuth } from "@/auth/useAuth";
import { useRecurso } from "@/shared/useRecurso";
import { FormularioOcorrencia } from "./FormularioOcorrencia";
import { podeEditar } from "./ocorrencias";

export function EditarOcorrencia() {
    const { id } = useParams();
    const api = useApi();
    const { usuario } = useAuth();
    const recurso = useRecurso(api, `/ocorrencia/api/v1/${id}`);
    if (recurso.status === "loading") return <Text role="status" p="8">Carregando ocorrência...</Text>;
    if (recurso.status === "not-found") return <Text p="8">Ocorrência não encontrada.</Text>;
    if (recurso.status === "error") return <Stack p="8" role="alert"><Text>Não foi possível carregar a ocorrência.</Text>
        <Button onClick={recurso.recarregar}>Tentar novamente: ocorrência</Button></Stack>;
    if (!podeEditar(recurso.dados, usuario)) return <Stack p="8"><Text>Apenas o cidadão autor pode editar uma ocorrência aberta.</Text>
        <Button asChild><Link to={`/ocorrencias/${id}`}>Ver detalhes</Link></Button></Stack>;
    return <FormularioOcorrencia key={id} ocorrencia={recurso.dados} />;
}
