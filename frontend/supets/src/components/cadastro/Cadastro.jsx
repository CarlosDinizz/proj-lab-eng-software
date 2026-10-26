import { Box, Button, Card, Field, Input, Stack, Tabs } from "@chakra-ui/react";
import { CadastroCidadao } from "./CadastroCidadao";
import { CadastroOng } from "./CadastroOng";
import { useNavigate } from "react-router-dom";

export function Cadastro() {

    const navigate = useNavigate();

    function handleNavigate(path) {
        if (path) navigate(path);
    }

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            px="4"
            height="900px"
            minHeight="900px"
        >
            <Card.Root
                maxWidth="xl"
                width="full"
                mx="auto"
            >
                {/* O Tabs.Root agora envolve tudo o que usa as partes do Tabs */}
                <Tabs.Root defaultValue="cidadao" variant="enclosed" colorPalette="purple">
                    <Card.Header>
                        <Card.Title>Fazer cadastro</Card.Title>
                        <Tabs.List mt="4">
                            <Tabs.Trigger value="cidadao" width="full">
                                Cidadão
                            </Tabs.Trigger>
                            <Tabs.Trigger value="ong" width="full">
                                ONG
                            </Tabs.Trigger>
                        </Tabs.List>
                    </Card.Header>

                    <Card.Body>
                        <Tabs.Content 
                            value="cidadao"
                        >
                            <CadastroCidadao />
                        </Tabs.Content>
                        <Tabs.Content 
                            value="ong"
                            _open={{
                                animationName: "fade-in, scale-in",
                              
                            }}
                            _closed={{
                                animationName: "fade-out, scale-out",
                                
                            }}
                        >
                            <CadastroOng />
                        </Tabs.Content>
                    </Card.Body>
                    <Card.Footer colorPalette="orange" justifyContent="flex-end">
                        <Button
                            onClick={() => handleNavigate("/")}
                        >Cadastrar</Button>
                    </Card.Footer>
                </Tabs.Root>
            </Card.Root>
        </Box>
    );
}