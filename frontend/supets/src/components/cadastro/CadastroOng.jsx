import { Box, Button, Card, Field, Input, Stack, Tabs, HStack } from "@chakra-ui/react";

export function CadastroOng() {
    return (
         <Stack gap="4" w="full">
            <Field.Root>
                <Field.Label>Nome</Field.Label>
                <Input placeholder="Insira o nome da ONG"/>
            </Field.Root>
            <Field.Root>
                <Field.Label>CNPJ</Field.Label>
                <Input placeholder="Insira o CNPJ da ONG" />
            </Field.Root>
            <HStack>
                <Field.Root>
                    <Field.Label>CEP</Field.Label>
                    <Input placeholder="Insira o CEP"/>
                </Field.Root>
                <Field.Root>
                    <Field.Label>Endereço</Field.Label>
                    <Input placeholder="Inserir o endereço da ONG"/>
                </Field.Root>
            </HStack>
            <HStack>
                <Field.Root>
                    <Field.Label>Município</Field.Label>
                    <Input placeholder="Insira o município da ONG"/>
                </Field.Root>
                <Field.Root>
                    <Field.Label>Estado</Field.Label>
                    <Input placeholder="Insira o estado da ONG"/>
                </Field.Root>
            </HStack>
            <Field.Root>
                <Field.Label>E-mail</Field.Label>
                <Input type="email" placeholder="Escreva o e-mail da ONG"/>
            </Field.Root>
            <Field.Root>
                <Field.Label>Senha</Field.Label>
                <Input type="password" placeholder="Insira a senha de acesso"/>
            </Field.Root>
        </Stack>
    );
}