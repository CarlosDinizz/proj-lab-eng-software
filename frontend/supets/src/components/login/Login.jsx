import { Box, Button, Card, Field, Input, Stack } from "@chakra-ui/react";

export function Login() {
    return (
        <Box
            height="500px"
            display="flex"
            justifyContent="center"
            alignItems="center"
            px="4"
        >
            <Card.Root
                maxWidth="lg"
                width="full"
                mx="auto"
            >
                <Card.Header>
                    <Card.Title>Login</Card.Title>
                    <Card.Description>
                        Faça seu login como ONG ou Cidadão abaixo:
                    </Card.Description>
                </Card.Header>
                <Card.Body>
                    <Stack gap="4" w="full">
                        <Field.Root>
                            <Field.Label>E-mail</Field.Label>
                            <Input type="email" placeholder="Insira seu e-mail"/>
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>Senha</Field.Label>
                            <Input type="password" placeholder="Insira sua senha"/>
                        </Field.Root>
                    </Stack>
                </Card.Body>
                <Card.Footer colorPalette="orange" justifyContent="flex-end">
                    <Button>Entrar</Button>
                </Card.Footer>
            </Card.Root>
        </Box>
    );
}
