import { Box, Button, Flex, Link, Text } from "@chakra-ui/react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { toaster } from "@/components/ui/toaster";

export function Navbar() {
    const navigate = useNavigate();
    const { usuario, sair } = useAuth();
    const links = [
        ["/", "Início"], ["/campanhas", "Campanhas"], ["/sobre", "Sobre"],
        ...(usuario ? [["/ocorrencias", "Ocorrências"], ["/ocorrencias/minhas", "Minhas ocorrências"],
            ...(usuario.perfil === "ONG" ? [["/campanhas/minhas", "Minhas campanhas"], ["/campanhas/nova", "Criar campanha"]]
                : [["/campanhas/participadas", "Campanhas participadas"], ["/ocorrencias/nova", "Criar ocorrência"]])]
            : [["/login", "Entrar"], ["/cadastro", "Cadastrar-se"]]),
    ];
    function logout() {
        sair();
        toaster.create({ title: "Você saiu da sua conta.", type: "info" });
        navigate("/");
    }
    return (
        <Box as="header" bg="purple.700" color="white" px={{ base: "3", md: "5" }} py="4">
            <Flex gap="3" wrap="wrap" align="center" justify="space-between">
                <Text fontWeight="bold" fontSize="xl">SuPets</Text>
                <Flex as="nav" aria-label="Navegação principal" gap="2" wrap="wrap" align="center">
                    {links.map(([to, titulo]) => <Link key={to} asChild color="white" px="2" py="1" borderRadius="sm"
                        _currentPage={{ bg: "purple.900", textDecoration: "underline" }} _focusVisible={{ outline: "2px solid", outlineOffset: "3px" }}>
                        <NavLink to={to} end>{titulo}</NavLink>
                    </Link>)}
                    {usuario && <><Text fontSize="sm">Olá, {usuario.nome?.split(" ")[0]} ({usuario.perfil === "ONG" ? "ONG" : "Cidadão"})</Text>
                        <Button variant="outline" color="white" onClick={logout}>Sair</Button></>}
                </Flex>
            </Flex>
        </Box>
    );
}