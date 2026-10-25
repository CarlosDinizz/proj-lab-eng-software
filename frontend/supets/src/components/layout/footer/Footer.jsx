import { Box, Button, Flex, Text } from "@chakra-ui/react";

export function Footer() {

    const info = getFooterInfo();

    return (
        <>
            <Box bg={"purple.700"} width={"100%"} minHeight={"5rem"} height="full" padding={"20px"}>
                <Flex justifyContent="space-evenly">
                    {info.map((conteudo) =>
                        <Flex color="white" flexDir="column">
                            {conteudo.map((linha) =>
                                <Text fontWeight={linha.fontWeight} fontSize={linha.fontSize}>
                                    {linha.valor}
                                </Text>
                            )}
                        </Flex>
                    )}

                    <Button colorPalette="orange" alignSelf="center">
                        Seja um voluntário!
                    </Button>

                </Flex>
            </Box>
        </>
    )
}

function getFooterInfo() {
    return  [
        [ { valor: "Início", fontWeight: "bold" }, { valor: "Início", fontSize: "15px" }, { valor: "Sobre", fontSize: "15px" } ],
        [ { valor: "Links", fontWeight: "bold" }, { valor: "Cadastrar-se", fontSize: "15px" } ],
        [ { valor: "Contato", fontWeight: "bold" }, { valor: "(11) 2323-2334", fontSize: "15px" }, { valor: "supets@contato.com", fontSize: "15px" } ],
    ];
}
