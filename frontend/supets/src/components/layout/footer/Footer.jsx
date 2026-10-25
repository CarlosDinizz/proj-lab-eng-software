import { Box, Button, Flex, Link, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export function Footer() {
    const navigate = useNavigate();
    const info = getFooterInfo();

    function handleNavigate(path) {
        if (path) navigate(path);
    }

    return (
        <Box bg="purple.700" width="100%" minHeight="5rem" height="full" padding="20px">
            <Flex justifyContent="space-evenly" wrap="wrap" gap={4}>
                {info.map((conteudo, conteudoIndex) => (
                    <Flex key={conteudoIndex} color="white" flexDir="column" gap={1}>
                        {conteudo.map((linha, linhaIndex) => (
                            linha.link ? (
                                <Link
                                    key={linhaIndex}
                                    color="white"
                                    fontSize={linha.fontSize || "15px"}
                                    onClick={() => handleNavigate(linha.path)}
                                    _hover={{ textDecoration: "underline", color: "orange.200" }}
                                    cursor="pointer"
                                >
                                    {linha.valor}
                                </Link>
                            ) : (
                                <Text
                                    key={linhaIndex}
                                    fontWeight={linha.fontWeight}
                                    fontSize={linha.fontSize}
                                >
                                    {linha.valor}
                                </Text>
                            )
                        ))}
                    </Flex>
                ))}

                <Button
                    colorPalette="orange"
                    alignSelf="center"
                    onClick={() => navigate("/cadastro")}
                >
                    Seja um voluntário!
                </Button>
            </Flex>
        </Box>
    );
}

function getFooterInfo() {
    return [
        [
            { valor: "Início", fontWeight: "bold" },
            { valor: "Início", fontSize: "15px", path: "/", link: true },
            { valor: "Sobre", fontSize: "15px", path: "/sobre", link: true }
        ],
        [
            { valor: "Links", fontWeight: "bold" },
            { valor: "Cadastrar-se", fontSize: "15px", path: "/login", link: true }
        ],
        [
            { valor: "Contato", fontWeight: "bold" },
            { valor: "(11) 2323-2334", fontSize: "15px" },
            { valor: "supets@contato.com", fontSize: "15px" }
        ],
    ];
}
