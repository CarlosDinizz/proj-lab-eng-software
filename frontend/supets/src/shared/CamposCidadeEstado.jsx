import { useEffect, useState } from "react";
import { Button, Field, NativeSelect, Stack, Text } from "@chakra-ui/react";
import { carregarMunicipios, ESTADOS, normalizarUf } from "./endereco";

export function CamposCidadeEstado({ estado = "", cidade = "", onChange, disabled = false, erros = {}, nomeCidade = "cidade", onStatus }) {
    const [recurso, setRecurso] = useState({ status: "loading", dados: null });
    const [tentativa, setTentativa] = useState(0);
    useEffect(() => {
        let ativo = true;
        setRecurso({ status: "loading", dados: null });
        carregarMunicipios().then((dados) => {
            if (ativo) setRecurso({ status: "ready", dados });
        }).catch(() => { if (ativo) setRecurso({ status: "error", dados: null }); });
        return () => { ativo = false; };
    }, [tentativa]);
    const uf = normalizarUf(estado);
    const cidades = recurso.dados?.[uf] ?? [];
    const valido = recurso.status === "ready" && ESTADOS.includes(estado) && cidades.includes(cidade);
    useEffect(() => { onStatus?.(valido); }, [onStatus, valido]);
    const alterar = (name, value) => onChange({ target: { name, value } });
    return (
        <Stack gap="3">
            {recurso.status === "loading" && <Text role="status">Carregando municípios...</Text>}
            {recurso.status === "error" && <Stack role="alert"><Text>Não foi possível carregar os municípios. O preenchimento depende desta lista.</Text>
                <Button type="button" size="sm" variant="outline" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente: municípios</Button></Stack>}
            <Field.Root required invalid={Boolean(erros.estado) || Boolean(estado && !ESTADOS.includes(estado))}>
                <Field.Label>Estado (UF)<Field.RequiredIndicator /></Field.Label>
                <NativeSelect.Root disabled={disabled || recurso.status !== "ready"}>
                    <NativeSelect.Field name="estado" value={estado} onChange={(e) => {
                        alterar("estado", e.target.value);
                        alterar(nomeCidade, "");
                    }}>
                        <option value="">Selecione a UF</option>
                        {estado && !ESTADOS.includes(estado) && <option value={estado}>{estado} (valor anterior inválido)</option>}
                        {ESTADOS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </NativeSelect.Field><NativeSelect.Indicator />
                </NativeSelect.Root>
                <Field.ErrorText>{erros.estado || "A UF salva não é válida. Selecione uma UF para corrigir."}</Field.ErrorText>
            </Field.Root>
            <Field.Root required invalid={Boolean(erros[nomeCidade]) || Boolean(cidade && recurso.status === "ready" && !cidades.includes(cidade))}>
                <Field.Label>{nomeCidade === "municipio" ? "Município" : "Cidade"}<Field.RequiredIndicator /></Field.Label>
                <NativeSelect.Root disabled={disabled || recurso.status !== "ready" || !ESTADOS.includes(estado)}>
                    <NativeSelect.Field name={nomeCidade} value={cidade} onChange={(e) => alterar(nomeCidade, e.target.value)}>
                        <option value="">Selecione o município</option>
                        {cidade && !cidades.includes(cidade) && <option value={cidade}>{cidade} (valor anterior; selecione uma opção válida)</option>}
                        {cidades.map((item) => <option key={item} value={item}>{item}</option>)}
                    </NativeSelect.Field><NativeSelect.Indicator />
                </NativeSelect.Root>
                <Field.ErrorText>{erros[nomeCidade] || "O município salvo não corresponde à UF. Corrija explicitamente antes de salvar."}</Field.ErrorText>
            </Field.Root>
        </Stack>
    );
}
