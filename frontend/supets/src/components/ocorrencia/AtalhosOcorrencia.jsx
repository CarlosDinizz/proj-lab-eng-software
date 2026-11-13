import { Button, Card, HStack, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";

/** Bloco "Ocorrências [Criar] | [Minhas Ocorrências]" da tela inicial do wireframe. */
export function AtalhosOcorrencia() {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    if (!usuario) return null;

    return (
        <Card.Root mb="6">
            <Card.Body>
                <Text fontWeight="bold" fontSize="xl" mb="3">Ocorrências</Text>
                <HStack wrap="wrap">
                    {usuario.perfil === "CIDADAO" && (
                        <Button colorPalette="orange" onClick={() => navigate("/ocorrencias/nova")}>Criar</Button>
                    )}
                    <Button colorPalette="purple" variant="outline" onClick={() => navigate("/ocorrencias/minhas")}>Minhas Ocorrências</Button>
                    <Button colorPalette="purple" variant="outline" onClick={() => navigate("/ocorrencias")}>Ver ocorrências próximas</Button>
                </HStack>
            </Card.Body>
        </Card.Root>
    );
}
