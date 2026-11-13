import { Badge, Button, Card, HStack, Stack, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { STATUS, formatarData, formatarDistancia } from "./ocorrencias";

/** Resumo de uma ocorrência, usado na página inicial e na lista de ocorrências. */
export function CartaoOcorrencia({ ocorrencia, distanciaKm, etiqueta }) {
    const navigate = useNavigate();
    const status = STATUS[ocorrencia.status];

    return (
        <Card.Root minHeight="13rem" maxWidth="xs" width="full" colorPalette="purple">
            <Card.Body display="flex" flexDirection="column" flex="1" width="full" gap="2">
                <HStack wrap="wrap">
                    <Badge colorPalette={status?.cor}>{status?.texto}</Badge>
                    <Badge variant="outline">{ocorrencia.tipoOcorrencia}</Badge>
                    {etiqueta && <Badge colorPalette="purple">{etiqueta}</Badge>}
                </HStack>
                <Card.Title>{ocorrencia.titulo}</Card.Title>
                <Card.Description lineClamp="3">{ocorrencia.descricao}</Card.Description>
                <Card.Footer mt="auto" p="0">
                    <Stack gap="2" align="start">
                        <Text fontSize="14px">
                            {ocorrencia.animal?.especie} · {formatarData(ocorrencia.dataOcorrido)}
                            {distanciaKm != null && ` · a ${formatarDistancia(distanciaKm)}`}
                        </Text>
                        <Text fontSize="14px">Local: {ocorrencia.endereco}, {ocorrencia.cidade} - {ocorrencia.estado}</Text>
                        <Button onClick={() => navigate(`/ocorrencias/${ocorrencia.id}`)}>Visualizar ocorrência</Button>
                    </Stack>
                </Card.Footer>
            </Card.Body>
        </Card.Root>
    );
}
