import { Box, Button, Card, Field, Input, Stack, Tabs, HStack } from "@chakra-ui/react";

export function CadastroCidadao() {
    return (
          <Stack gap="4" w="full">
            <Field.Root>
                <Field.Label>Nome</Field.Label>
                <Input placeholder="Insira seu nome completo"/>
            </Field.Root>
            <Field.Root>
                <Field.Label>CPF</Field.Label>
                <Input placeholder="Insira seu CPF" />
            </Field.Root>
            <HStack>
                <Field.Root>
                    <Field.Label>CEP</Field.Label>
                    <Input placeholder="Insira seu CEP"/>
                </Field.Root>
                <Field.Root>
                    <Field.Label>Endereço</Field.Label>
                    <Input placeholder="Inserir seu endereço"/>
                </Field.Root>
            </HStack>
            <HStack>
                <Field.Root>
                    <Field.Label>Município</Field.Label>
                    <Input placeholder="Insira seu município"/>
                </Field.Root>
                <Field.Root>
                    <Field.Label>Estado</Field.Label>
                    <Input placeholder="Insira seu estado"/>
                </Field.Root>
            </HStack>
            <Field.Root>
                <Field.Label>E-mail</Field.Label>
                <Input type="email" placeholder="Escreva seu e-mail"/>
            </Field.Root>
            <Field.Root>
                <Field.Label>Senha</Field.Label>
                <Input type="password" placeholder="Insira uma senha de acesso"/>
            </Field.Root>
        </Stack>
    );
}