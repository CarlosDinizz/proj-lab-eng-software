import { Box, Button, Flex, Link, Stack, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

export function Footer() {
    return <Box as="footer" bg="purple.700" color="white" width="full" p="5">
        <Flex justify="space-evenly" wrap="wrap" gap="4">
            <Stack><Text fontWeight="bold">SuPets</Text><Text>Colaboração na proteção animal.</Text></Stack>
            <Flex as="nav" aria-label="Links do rodapé" gap="4" wrap="wrap" align="center">
                {[["/", "Início"], ["/sobre", "Sobre"], ["/cadastro", "Cadastrar-se"]].map(([to, nome]) =>
                    <Link key={to} asChild color="white" _focusVisible={{ outline: "2px solid", outlineOffset: "3px" }}><RouterLink to={to}>{nome}</RouterLink></Link>)}
            </Flex>
            <Button asChild colorPalette="orange"><RouterLink to="/cadastro">Seja um voluntário!</RouterLink></Button>
        </Flex>
    </Box>;
}
