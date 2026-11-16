import { Field, HStack, Input, Stack } from "@chakra-ui/react";
import { CamposCidadeEstado } from "@/shared/CamposCidadeEstado";

export function CadastroCampos({ tipo, valores, onChange, erros = {}, disabled = false, onStatus }) {
    const documento = tipo === "cidadao" ? "cpf" : "cnpj";
    const campo = (nome, label, props = {}) => (
        <Field.Root invalid={Boolean(erros[nome])} minW={{ base: "full", md: "0" }} flex="1">
            <Field.Label htmlFor={`${tipo}-${nome}`}>{label}</Field.Label>
            <Input id={`${tipo}-${nome}`} name={nome} value={valores[nome] || ""} onChange={onChange} disabled={disabled} required {...props} />
            <Field.ErrorText>{erros[nome]}</Field.ErrorText>
        </Field.Root>
    );

    return (
        <Stack gap="4" w="full">
            {campo("nome", "Nome")}
            {campo(documento, documento.toUpperCase(), documento === "cpf" ? { inputMode: "numeric" } : { autoCapitalize: "characters", placeholder: "12.ABC.345/01DE-35" })}
            <HStack wrap="wrap">
                {campo("cep", "CEP", { inputMode: "numeric" })}
                {campo("endereco", "Endereço")}
            </HStack>
            <CamposCidadeEstado estado={valores.estado} cidade={valores.municipio} nomeCidade="municipio"
                onChange={onChange} erros={erros} disabled={disabled} onStatus={onStatus} />
            {campo("email", "E-mail", { type: "email" })}
            {campo("senha", "Senha", { type: "password", autoComplete: "new-password" })}
        </Stack>
    );
}
