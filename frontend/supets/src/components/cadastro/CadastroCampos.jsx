import { Field, HStack, Input, Stack } from "@chakra-ui/react";

export function CadastroCampos({ tipo, valores, onChange }) {
    const documento = tipo === "cidadao" ? "cpf" : "cnpj";
    const campo = (nome, label, props = {}) => (
        <Field.Root>
            <Field.Label htmlFor={`${tipo}-${nome}`}>{label}</Field.Label>
            <Input id={`${tipo}-${nome}`} name={nome} value={valores[nome] || ""} onChange={onChange} required {...props} />
        </Field.Root>
    );

    return (
        <Stack gap="4" w="full">
            {campo("nome", "Nome")}
            {campo(documento, documento.toUpperCase(), { inputMode: "numeric" })}
            <HStack>
                {campo("cep", "CEP", { inputMode: "numeric" })}
                {campo("endereco", "Endereço")}
            </HStack>
            <HStack>
                {campo("municipio", "Município")}
                {campo("estado", "Estado", { maxLength: 2 })}
            </HStack>
            {campo("email", "E-mail", { type: "email" })}
            {campo("senha", "Senha", { type: "password", autoComplete: "new-password" })}
        </Stack>
    );
}
