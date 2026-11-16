import { useEffect, useRef, useState } from "react";
import { Box, Button, Card, Field, HStack, Input, NativeSelect, Stack, Text, Textarea } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";
import { useApi } from "@/auth/useApi";
import { SeletorDeLocal } from "./Mapa";
import { useLocalizacao } from "./useLocalizacao";
import { CENTRO_PADRAO, VALORES_INICIAIS, errosDoBack, formatarCep, hoje, montarCorpo, validar, valoresDe } from "./ocorrencias";
import { CamposCidadeEstado } from "@/shared/CamposCidadeEstado";
import { FeedbackLocalizacao } from "./FeedbackLocalizacao";

const API = "/ocorrencia/api/v1";

/** Conteúdo completo compartilhado por criação e edição. */
export function FormularioOcorrencia({ ocorrencia = null }) {
    const api = useApi();
    const navigate = useNavigate();
    const localizacao = useLocalizacao();
    const editando = Boolean(ocorrencia);
    const [valores, setValores] = useState(() => editando ? valoresDe(ocorrencia) : VALORES_INICIAIS);
    const [erros, setErros] = useState({});
    const [referencias, setReferencias] = useState({ status: "loading", dados: { tipos: [], especies: [], sexos: [], portes: [] } });
    const opcoesProntas = referencias.status === "ready" && Object.values(referencias.dados).every((lista) => lista.length > 0);
    const [tentativa, setTentativa] = useState(0);
    const [enderecoValido, setEnderecoValido] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [bloqueada, setBloqueada] = useState(false);
    const pendente = useRef(false);
    const ativa = useRef(true);
    useEffect(() => { ativa.current = true; return () => { ativa.current = false; }; }, []);

    // Carrega as listas dos selects (tipo, espécie, sexo, porte) ao abrir a tela
    useEffect(() => {
        const controller = new AbortController();
        setReferencias({ status: "loading", dados: { tipos: [], especies: [], sexos: [], portes: [] } });
        const buscar = (caminho) => api(`${API}/${caminho}`, { signal: controller.signal }).then((resposta) => {
            if (!resposta.ok) throw new Error();
            return resposta.json();
        });
        Promise.all(["tipos", "especies", "sexos", "portes"].map(buscar))
            .then(([tipos, especies, sexos, portes]) => {
                if (controller.signal.aborted) return;
                const dados = { tipos, especies, sexos, portes };
                if (Object.values(dados).some((lista) => !Array.isArray(lista))) throw new Error();
                setReferencias({ status: "ready", dados });
            })
            .catch(() => {
                if (!controller.signal.aborted) setReferencias({ status: "error", dados: { tipos: [], especies: [], sexos: [], portes: [] } });
            });
        return () => controller.abort();
    }, [api, tentativa]);

    function mudar(nome, valor) {
        setValores((anteriores) => ({ ...anteriores, [nome]: valor }));
        // Some o erro do campo assim que a pessoa mexe nele
        setErros((anteriores) => ({ ...anteriores, [nome]: undefined }));
    }

    function alterar(event) {
        const { name, value } = event.target;
        mudar(name, name === "cep" ? formatarCep(value) : value);
    }

    function marcarLocal({ lat, lon }) {
        setValores((anteriores) => ({ ...anteriores, lat, lon }));
        setErros((anteriores) => ({ ...anteriores, lat: undefined }));
    }

    async function criar(event) {
        event.preventDefault();
        if (pendente.current || !opcoesProntas || !enderecoValido || bloqueada) return;

        const errosLocais = validar(valores);
        setErros(errosLocais);
        if (Object.keys(errosLocais).length > 0) {
            toaster.create({ title: "Confira os campos destacados.", type: "error" });
            return;
        }

        pendente.current = true;
        setEnviando(true);
        try {
            const resposta = await api(editando ? `${API}/${ocorrencia.id}` : API, {
                method: editando ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(montarCorpo(valores)),
            });
            if (resposta.ok) {
                const salva = await resposta.json();
                if (!ativa.current) return;
                navigate(`/ocorrencias/${salva.id}`, { replace: true });
                return;
            }
            if (resposta.status === 401) return; // o useApi já desloga e manda para o login
            const corpo = await resposta.json().catch(() => ({}));
            if (!ativa.current) return;
            setErros(errosDoBack(corpo)); // o back responde {campo: mensagem}
            if (resposta.status === 409 && editando) setBloqueada(true);
            toaster.create({
                title: "Não foi possível salvar a ocorrência",
                description: corpo.message ?? "Confira os campos destacados.",
                type: "error",
            });
        } catch {
            if (ativa.current) toaster.create({ title: "Não foi possível salvar a ocorrência", description: "Tente novamente.", type: "error" });
        } finally {
            pendente.current = false;
            if (ativa.current) setEnviando(false);
        }
    }


    // Atalhos para não repetir o mesmo bloco de Field em cada campo
    const campoTexto = (nome, label, props = {}) => (
        <Field.Root invalid={Boolean(erros[nome])} required={props.required} minW={{ base: "full", md: "0" }} flex="1">
            <Field.Label>{label}<Field.RequiredIndicator /></Field.Label>
            <Input name={nome} value={valores[nome]} onChange={alterar} disabled={enviando} {...props} />
            <Field.ErrorText>{erros[nome]}</Field.ErrorText>
        </Field.Root>
    );

    const campoSelect = (nome, label, itens, required = false) => (
        <Field.Root invalid={Boolean(erros[nome])} required={required} minW={{ base: "full", md: "0" }} flex="1">
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

    // Cada lista do back vira {id, texto} para o select
    const deNomes = (lista) => lista.map((item) => ({ id: item.id, texto: item.nome }));
    const opcoes = referencias.dados;
    const ponto = valores.lat == null ? null : { lat: valores.lat, lon: valores.lon };

    return (
        <Box display="flex" justifyContent="center" py="10" px="4">
            <Card.Root maxWidth="3xl" width="full">
                <form onSubmit={criar} noValidate>
                    <Card.Header>
                        <Card.Title>{editando ? "Editar ocorrência" : "Criar nova ocorrência"}</Card.Title>
                        <Card.Description>Campos com * são obrigatórios.</Card.Description>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap="4">
                            {!opcoesProntas && <Stack role="status">
                                <Text>{referencias.status === "loading" ? "Carregando opções..." : referencias.status === "ready" ? "As listas de referência estão vazias. Não é possível salvar." : "Não foi possível carregar as opções do formulário."}</Text>
                                {referencias.status !== "loading" && <Button type="button" variant="outline" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente: opções</Button>}
                            </Stack>}
                            {bloqueada && <Stack role="alert"><Text>O estado da ocorrência mudou. Consulte os detalhes atualizados antes de editar.</Text>
                                <Button type="button" onClick={() => navigate(`/ocorrencias/${ocorrencia.id}`)}>Recarregar detalhes</Button></Stack>}
                            {campoTexto("titulo", "Título", { required: true, maxLength: 255, placeholder: "Insira o título da ocorrência" })}

                            <Field.Root invalid={Boolean(erros.descricao)} required>
                                <Field.Label>Descrição<Field.RequiredIndicator /></Field.Label>
                                <Textarea name="descricao" value={valores.descricao} onChange={alterar} disabled={enviando}
                                    rows={4} placeholder="Insira a descrição da ocorrência" />
                                <Field.ErrorText>{erros.descricao}</Field.ErrorText>
                            </Field.Root>

                            <HStack align="start" wrap="wrap">
                                {campoTexto("dataOcorrido", "Data do ocorrido", { required: true, type: "date", max: hoje() })}
                                {campoSelect("tipoOcorrenciaId", "Tipo da ocorrência",
                                    opcoes.tipos.map((tipo) => ({ id: tipo.id, texto: tipo.tipo })), true)}
                            </HStack>
                            <HStack align="start" wrap="wrap">
                                {campoTexto("cep", "CEP", { required: true, inputMode: "numeric", placeholder: "00000-000" })}
                                {campoTexto("endereco", "Endereço", { required: true, placeholder: "Rua, número, bairro" })}
                            </HStack>
                            <CamposCidadeEstado estado={valores.estado} cidade={valores.cidade} onChange={alterar}
                                erros={erros} disabled={enviando || bloqueada} onStatus={setEnderecoValido} />

                            <Field.Root invalid={Boolean(erros.lat)} required>
                                <Field.Label>Local no mapa<Field.RequiredIndicator /></Field.Label>
                                <Field.HelperText>Clique no mapa onde o animal está, ou use a sua localização.</Field.HelperText>
                                <SeletorDeLocal ponto={ponto} centro={ponto ?? localizacao.local ?? CENTRO_PADRAO} onChange={marcarLocal} disabled={enviando || bloqueada} />
                                <HStack wrap="wrap">
                                    <Button size="sm" variant="outline" onClick={() => localizacao.pedir(marcarLocal)}
                                        disabled={enviando || bloqueada || localizacao.situacao === "buscando"}>
                                        {localizacao.situacao === "buscando" ? "Buscando..." : "Usar minha localização"}
                                    </Button>
                                    {ponto && <Text fontSize="sm" color="green.600">Local marcado.</Text>}
                                    <FeedbackLocalizacao situacao={localizacao.situacao} />
                                </HStack>
                                <Field.ErrorText>{erros.lat}</Field.ErrorText>
                            </Field.Root>

                            <Text fontStyle="italic" fontWeight="medium" pt="2">Informações do animal</Text>
                            <HStack align="start" wrap="wrap">
                                {campoTexto("nomeAnimal", "Nome", { placeholder: "Insira o nome do animal" })}
                                {campoSelect("especieId", "Espécie", deNomes(opcoes.especies), true)}
                            </HStack>
                            <HStack align="start" wrap="wrap">
                                {campoSelect("sexoId", "Sexo", deNomes(opcoes.sexos))}
                                {campoTexto("raca", "Raça", { placeholder: "Insira a raça do animal" })}
                            </HStack>
                            <HStack align="start" wrap="wrap">
                                {campoSelect("porteId", "Porte", deNomes(opcoes.portes))}
                            </HStack>
                        </Stack>
                    </Card.Body>
                    <Card.Footer colorPalette="orange" justifyContent="space-between">
                        <Button variant="outline" onClick={() => navigate(-1)} disabled={enviando}>Voltar</Button>
                        <Button type="submit" disabled={enviando || !opcoesProntas || !enderecoValido || bloqueada}>{enviando ? "Salvando..." : editando ? "Salvar" : "Criar"}</Button>
                    </Card.Footer>
                </form>
            </Card.Root>
        </Box>
    );
}
