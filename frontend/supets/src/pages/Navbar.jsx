import { Box, Button, Flex, Tabs, Text } from "@chakra-ui/react";

export function Navbar() {
    return (
        <>
            <Box bg={"cyan.800"} width={"100%"} height={"5rem"} padding={"20px"}>
                <Flex gap={"1rem"} color={"white"} justifyContent={"end"} textAlign={"center"} alignItems={"center"} alignContent={"center"} height={"100%"}>


                    <Tabs.Root defaultValue="inicio">
                        <Tabs.List>
                            <Tabs.Trigger value="inicio" color={"white"}>
                                Início
                            </Tabs.Trigger>

                            <Tabs.Trigger value="campanhas" color={"white"} _se>
                                Campanhas
                            </Tabs.Trigger>

                            <Tabs.Trigger value="sobre" color={"white"}>
                                Sobre
                            </Tabs.Trigger>
                        </Tabs.List>

                    </Tabs.Root>

                    <Button variant={"outline"} color={"white"} _hover={{ color: 'black' }}>
                        Login
                    </Button>

                    <Button variant={"outline"} color={"white"} _hover={{ color: 'black' }}>
                        Cadastre-se
                    </Button>
                </Flex>
            </Box>
        </>
    );
}