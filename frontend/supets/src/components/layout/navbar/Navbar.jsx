import { Box, Button, Flex, Tabs, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { toaster } from "@/components/ui/toaster";

export function Navbar() {

    const navigate = useNavigate();
    const { usuario, sair } = useAuth();

    const tabs = getTabs();

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

                    <Tabs.Root defaultValue="inicio" variant="plain">
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
        { id: 1, title: "Início", value: "inicio", color: "white" }, { id: 2, title: "Campanhas", value: "campanhas", color: "white" },
        { id: 3, title: "Sobre", value: "sobre", color: "white" }
    ];
}
