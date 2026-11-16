import { useEffect, useRef, useState } from "react";
import { Box, Button, Card, Field, HStack, Input, NativeSelect, Stack, Text, Textarea } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";
import { useApi } from "@/auth/useApi";
import { formatarCep } from "@/components/ocorrencia/ocorrencias";
import { CamposCidadeEstado } from "@/shared/CamposCidadeEstado";
import { useRecurso } from "@/shared/useRecurso";
import { API_CAMPANHAS, VALORES_INICIAIS, errosDoBack, hojeCampanha, montarCorpo, validar, valoresDe } from "./campanhas";

export function FormularioCampanha({ campanha = null }) {
    const api = useApi();
    const navigate = useNavigate();
    const editando = Boolean(campanha);
    const [valores, setValores] = useState(() => (editando ? valoresDe(campanha) : VALORES_INICIAIS));
    const [erros, setErros] = useState({});
    const referencias = useRecurso(api, `${API_CAMPANHAS}/tipos`);
    const tipos = Array.isArray(referencias.dados) ? referencias.dados : [];
    const opcoesProntas = referencias.status === "ready" && tipos.length > 0;
    const [enderecoValido, setEnderecoValido] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [salva, setSalva] = useState(false);
    const pendente = useRef(false);
    const ativa = useRef(true);
    useEffect(() => { ativa.current = true; return () => { ativa.current = false; }; }, []);

    const titulo = editando ? "Atualizar campanha" : "Criar nova campanha";


    function alterar(event) {
        const { name, value } = event.target;
        setValores((anteriores) => ({ ...anteriores, [name]: name === "cep" ? formatarCep(value) : value }));
        setErros((anteriores) => ({ ...anteriores, [name]: undefined }));
    }

    async function salvar(event) {
        event.preventDefault();
        if (pendente.current || !opcoesProntas || !enderecoValido) return;

        const errosLocais = validar(valores, hojeCampanha(), campanha?.dataInicio ?? null);
        setErros(errosLocais);
        if (Object.keys(errosLocais).length > 0) {
            toaster.create({ title: "Confira os campos destacados.", type: "error" });
            return;
        }

        pendente.current = true;
        setEnviando(true);
        try {
            const resposta = await api(editando ? `${API_CAMPANHAS}/${campanha.id}` : API_CAMPANHAS, {
                method: editando ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(montarCorpo(valores)),
            });
            if (!ativa.current) return;
            if (resposta.ok) {
                setSalva(true);
                return;
            }
            if (resposta.status === 401) return;
            const corpo = await resposta.json().catch(() => ({}));
            if (!ativa.current) return;
            setErros(errosDoBack(corpo));
            toaster.create({
                title: editando ? "Não foi possível atualizar a campanha" : "Não foi possível criar a campanha",
                description: corpo.message ?? "Confira os campos destacados.",
                type: "error",
            });
        } catch {
            if (ativa.current) toaster.create({ title: "Não foi possível salvar a campanha", description: "Tente novamente.", type: "error" });
        } finally {
            pendente.current = false;
            if (ativa.current) setEnviando(false);
        }
    }

    if (salva) {
        return (
            <Box display="flex" justifyContent="center" py="10" px="4">
                <Card.Root maxWidth="lg" width="full">
                    <Card.Header><Card.Title>{titulo}</Card.Title></Card.Header>
                    <Card.Body>
                        <Text color="green.600" fontWeight="medium">
                            {editando ? "Campanha atualizada com sucesso!" : "Campanha criada com sucesso!"}
                        </Text>
                    </Card.Body>
                    <Card.Footer colorPalette="orange" justifyContent="flex-end">
                        <Button onClick={() => navigate(editando ? `/campanhas/${campanha.id}` : "/")}>Continuar</Button>
                    </Card.Footer>
                </Card.Root>
            </Box>
        );
    }

    const campoTexto = (nome, label, props = {}) => (
        <Field.Root invalid={Boolean(erros[nome])} required minW={{ base: "full", md: "0" }} flex="1">
            <Field.Label>{label}<Field.RequiredIndicator /></Field.Label>
            <Input name={nome} value={valores[nome]} onChange={alterar} disabled={enviando} {...props} />
            <Field.ErrorText>{erros[nome]}</Field.ErrorText>
        </Field.Root>
    );

    const campoSelect = (nome, label, itens) => (
        <Field.Root invalid={Boolean(erros[nome])} required minW={{ base: "full", md: "0" }} flex="1">
            <Field.Label>{label}<Field.RequiredIndicator /></Field.Label>
            <NativeSelect.Root disabled={enviando}>
                <NativeSelect.Field name={nome} value={valores[nome]} onChange={alterar}>
                    <option value="">Selecione uma opção</option>
                    {itens.map(({ id, texto }) => <option key={id} value={id}>{texto}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Field.ErrorText>{erros[nome]}</Field.ErrorText>
        </Field.Root>
    );

    const minimoInicio = editando && campanha.dataInicio < hojeCampanha() ? campanha.dataInicio : hojeCampanha();

    return (
        <Box display="flex" justifyContent="center" py="10" px="4">
            <Card.Root maxWidth="3xl" width="full">
                <form onSubmit={salvar} noValidate>
                    <Card.Header>
                        <Card.Title>{titulo}</Card.Title>
                        <Card.Description>Campos com * são obrigatórios.</Card.Description>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap="4">
                            {!opcoesProntas && <Stack role="status">
                                <Text>{referencias.status === "loading" ? "Carregando tipos de campanha..." : referencias.status === "ready" ? "A lista de tipos está vazia. Não é possível salvar." : "Não foi possível carregar os tipos de campanha."}</Text>
                                {referencias.status !== "loading" && <Button type="button" variant="outline" onClick={referencias.recarregar}>Tentar novamente: tipos</Button>}
                            </Stack>}
                            {campoTexto("titulo", "Título", { maxLength: 255, placeholder: "Digite o título da campanha" })}

                            <Field.Root invalid={Boolean(erros.descricao)} required>
                                <Field.Label>Descrição<Field.RequiredIndicator /></Field.Label>
                                <Textarea name="descricao" value={valores.descricao} onChange={alterar} disabled={enviando}
                                    rows={4} placeholder="Insira a descrição da campanha" />
                                <Field.ErrorText>{erros.descricao}</Field.ErrorText>
                            </Field.Root>

                            <HStack align="start" wrap="wrap">
                                {campoTexto("dataInicio", "Data de início", { type: "date", min: minimoInicio })}
                                {campoTexto("dataFim", "Data de fim", { type: "date", min: valores.dataInicio || minimoInicio })}
                            </HStack>
                            {campoSelect("tipoCampanhaId", "Tipo da campanha", tipos.map((tipo) => ({ id: tipo.id, texto: tipo.nome })))}
                            <HStack align="start" wrap="wrap">
                                {campoTexto("cep", "CEP", { inputMode: "numeric", placeholder: "00000-000" })}
                                {campoTexto("endereco", "Endereço", { placeholder: "Rua, número, bairro" })}
                            </HStack>
                            <CamposCidadeEstado estado={valores.estado} cidade={valores.cidade} onChange={alterar}
                                erros={erros} disabled={enviando} onStatus={setEnderecoValido} />
                        </Stack>
                    </Card.Body>
                    <Card.Footer colorPalette="orange" justifyContent="space-between">
                        <Button variant="outline" onClick={() => navigate(-1)} disabled={enviando}>Voltar</Button>
                        <Button type="submit" disabled={enviando || !opcoesProntas || !enderecoValido}>
                            {enviando ? "Salvando..." : editando ? "Salvar" : "Criar"}
                        </Button>
                    </Card.Footer>
                </form>
            </Card.Root>
        </Box>
    );
}