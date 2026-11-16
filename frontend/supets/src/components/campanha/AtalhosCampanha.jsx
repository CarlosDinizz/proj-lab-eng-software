import { Button, Card, HStack, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";

export function AtalhosCampanha() {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    if (!usuario) return null;
    const ehOng = usuario.perfil === "ONG";

    return (
        <Card.Root mb="6">
            <Card.Body>
                <Text fontWeight="bold" fontSize="xl" mb="3">Campanhas</Text>
                <HStack wrap="wrap">
                    {ehOng ? (
                        <>
                            <Button colorPalette="orange" onClick={() => navigate("/campanhas/nova")}>Criar</Button>
                            <Button colorPalette="purple" variant="outline" onClick={() => navigate("/campanhas/minhas")}>Minhas Campanhas</Button>
                        </>
                    ) : (
                        <>
                            <Button colorPalette="orange" onClick={() => navigate("/campanhas")}>Buscar</Button>
                            <Button colorPalette="purple" variant="outline" onClick={() => navigate("/campanhas/participadas")}>Participadas</Button>
                        </>
                    )}
                </HStack>
            </Card.Body>
        </Card.Root>
    );
}