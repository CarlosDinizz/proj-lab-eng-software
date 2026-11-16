import { Box, Button, Flex, Tabs, Text } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { toaster } from "@/components/ui/toaster";

export function Navbar() {

    const navigate = useNavigate();
    const { usuario, sair } = useAuth();

    const { pathname } = useLocation();
    const tabs = getTabs();
    // A aba marcada acompanha a página aberta; em outras páginas nenhuma fica marcada
    const abaAtual = tabs.find((aba) => aba.rota && (aba.rota === "/" ? pathname === "/" : pathname.startsWith(aba.rota)))?.value ?? null;

    function abrirAba(valor) {
        const rota = tabs.find((aba) => aba.value === valor)?.rota;
        if (rota) navigate(rota);
    }

    function moveToLogin() {
        navigate("/login");
    }

    function moveToCadastro() {
        navigate("/cadastro");
    }

    function logout() {
        sair();
        toaster.create({ title: "Você saiu da sua conta.", type: "info" });
        navigate("/");
    }

    return (
        <>
            <Box bg={"purple.700"} width={"100%"} height={"5rem"} padding={"20px"}>
                <Flex gap={"1rem"} color={"white"} justifyContent={"end"} textAlign={"center"} alignItems={"center"} alignContent={"center"} height={"100%"}>

                    <Tabs.Root value={abaAtual} onValueChange={({ value }) => abrirAba(value)} variant="plain">
                        <Tabs.List borderBottom="none">
                            {tabs.map((valor) =>
                                <Tabs.Trigger
                                    key={valor.id}
                                    value={valor.value}
                                    color={valor.color}
                                    borderBottom="none"
                                    _selected={{ color: "white" }}
                                >
                                    {valor.title}
                                </Tabs.Trigger>
                            )}

                            <Tabs.Indicator
                                bg="white"
                                height="2px"
                                borderRadius="full"
                                bottom="0"
                            />
                        </Tabs.List>
                    </Tabs.Root>

                    {usuario ? (
                        <>
                            <Button variant={"outline"} color={"white"} _hover={{ color: 'black' }} onClick={() => navigate("/ocorrencias")}>
                                Ocorrências
                            </Button>
                            <Text fontWeight="medium">
                                Olá, {usuario.nome?.split(" ")[0]}{usuario.perfil === "ONG" ? " (ONG)" : ""}
                            </Text>
                            <Button variant={"outline"} color={"white"} _hover={{ color: 'black' }} onClick={logout}>
                                Sair
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant={"outline"} color={"white"} _hover={{ color: 'black' }} onClick={() => moveToLogin()}>
                                Login
                            </Button>

                            <Button variant={"outline"} color={"white"} _hover={{ color: 'black' }} onClick={() => moveToCadastro()}>
                                Cadastre-se
                            </Button>
                        </>
                    )}
                </Flex>
            </Box>
        </>
    );
}


function getTabs() {
    return [
        { id: 1, title: "Início", value: "inicio", color: "white", rota: "/" },
        { id: 2, title: "Campanhas", value: "campanhas", color: "white", rota: "/campanhas" },
        { id: 3, title: "Sobre", value: "sobre", color: "white" }
    ];
}