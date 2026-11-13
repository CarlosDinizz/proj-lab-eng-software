import { useEffect, useState } from "react";
import { Box, Button, Card, Field, HStack, Input, NativeSelect, Stack, Text, Textarea } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";
import { useApi } from "@/auth/useApi";
import { SeletorDeLocal } from "./Mapa";
import { useLocalizacao } from "./useLocalizacao";
import { CENTRO_PADRAO, ESTADOS, VALORES_INICIAIS, errosDoBack, formatarCep, hoje, montarCorpo, validar } from "./ocorrencias";

const API = "/ocorrencia/api/v1";

/** UC001: Registrar ocorrência (wireframe "Criar nova ocorrência"). */
export function NovaOcorrencia() {
    const api = useApi();
    const navigate = useNavigate();
    const localizacao = useLocalizacao();
    const [valores, setValores] = useState(VALORES_INICIAIS);
    const [erros, setErros] = useState({});
    const [opcoes, setOpcoes] = useState({ tipos: [], especies: [], sexos: [], portes: [] });
    const [enviando, setEnviando] = useState(false);
    const [criada, setCriada] = useState(false);

    // Carrega as listas dos selects (tipo, espécie, sexo, porte) ao abrir a tela
    useEffect(() => {
        const controller = new AbortController();
        const buscar = (caminho) => api(`${API}/${caminho}`, { signal: controller.signal }).then((resposta) => {
            if (!resposta.ok) throw new Error();
            return resposta.json();
        });
        Promise.all(["tipos", "especies", "sexos", "portes"].map(buscar))
            .then(([tipos, especies, sexos, portes]) => setOpcoes({ tipos, especies, sexos, portes }))
            .catch((error) => {
                if (error.name !== "AbortError") {
                    toaster.create({ title: "Não foi possível carregar as opções do formulário.", type: "error" });
                }
            });
        return () => controller.abort();
    }, [api]);

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
        if (enviando) return;

        const errosLocais = validar(valores);
        setErros(errosLocais);
        if (Object.keys(errosLocais).length > 0) {
            toaster.create({ title: "Confira os campos destacados.", type: "error" });
            return;
        }

        setEnviando(true);
        try {
            const resposta = await api(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(montarCorpo(valores)),
            });
            if (resposta.ok) {
                setCriada(true);
                return;
            }
            if (resposta.status === 401) return; // o useApi já desloga e manda para o login
            const corpo = await resposta.json().catch(() => ({}));
            setErros(errosDoBack(corpo)); // o back responde {campo: mensagem}
            toaster.create({
                title: "Não foi possível criar a ocorrência",
                description: corpo.message ?? "Confira os campos destacados.",
                type: "error",
            });
        } catch {
            toaster.create({ title: "Não foi possível criar a ocorrência", description: "Tente novamente.", type: "error" });
        } finally {
            setEnviando(false);
        }
    }

    if (criada) {
        return (
            <Box display="flex" justifyContent="center" py="10" px="4">
                <Card.Root maxWidth="lg" width="full">
                    <Card.Header><Card.Title>Criar nova ocorrência</Card.Title></Card.Header>
                    <Card.Body><Text color="green.600" fontWeight="medium">Ocorrência criada com sucesso!</Text></Card.Body>
                    <Card.Footer colorPalette="orange" justifyContent="flex-end">
                        <Button onClick={() => navigate("/")}>Continuar</Button>
                    </Card.Footer>
                </Card.Root>
            </Box>
        );
    }

    // Atalhos para não repetir o mesmo bloco de Field em cada campo
    const campoTexto = (nome, label, props = {}) => (
        <Field.Root invalid={Boolean(erros[nome])} required={props.required}>
            <Field.Label>{label}<Field.RequiredIndicator /></Field.Label>
            <Input name={nome} value={valores[nome]} onChange={alterar} disabled={enviando} {...props} />
            <Field.ErrorText>{erros[nome]}</Field.ErrorText>
        </Field.Root>
    );

    const campoSelect = (nome, label, itens, required = false) => (
        <Field.Root invalid={Boolean(erros[nome])} required={required}>
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
    const ponto = valores.lat == null ? null : { lat: valores.lat, lon: valores.lon };

    return (
        <Box display="flex" justifyContent="center" py="10" px="4">
            <Card.Root maxWidth="3xl" width="full">
                <form onSubmit={criar} noValidate>
                    <Card.Header>
                        <Card.Title>Criar nova ocorrência</Card.Title>
                        <Card.Description>Campos com * são obrigatórios.</Card.Description>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap="4">
                            {campoTexto("titulo", "Título", { required: true, maxLength: 255, placeholder: "Insira o título da ocorrência" })}

                            <Field.Root invalid={Boolean(erros.descricao)} required>
                                <Field.Label>Descrição<Field.RequiredIndicator /></Field.Label>
                                <Textarea name="descricao" value={valores.descricao} onChange={alterar} disabled={enviando}
                                    rows={4} placeholder="Insira a descrição da ocorrência" />
                                <Field.ErrorText>{erros.descricao}</Field.ErrorText>
                            </Field.Root>

                            <HStack align="start">
                                {campoTexto("dataOcorrido", "Data do ocorrido", { required: true, type: "date", max: hoje() })}
                                {campoSelect("tipoOcorrenciaId", "Tipo da ocorrência",
                                    opcoes.tipos.map((tipo) => ({ id: tipo.id, texto: tipo.tipo })), true)}
                            </HStack>
                            <HStack align="start">
                                {campoTexto("cep", "CEP", { required: true, inputMode: "numeric", placeholder: "00000-000" })}
                                {campoTexto("endereco", "Endereço", { required: true, placeholder: "Rua, número, bairro" })}
                            </HStack>
                            <HStack align="start">
                                {campoTexto("cidade", "Cidade", { required: true, placeholder: "Ex.: São Paulo" })}
                                {campoSelect("estado", "Estado", ESTADOS.map((uf) => ({ id: uf, texto: uf })), true)}
                            </HStack>

                            <Field.Root invalid={Boolean(erros.lat)} required>
                                <Field.Label>Local no mapa<Field.RequiredIndicator /></Field.Label>
                                <Field.HelperText>Clique no mapa onde o animal está, ou use a sua localização.</Field.HelperText>
                                <SeletorDeLocal ponto={ponto} centro={localizacao.local ?? CENTRO_PADRAO} onChange={marcarLocal} />
                                <HStack>
                                    <Button size="sm" variant="outline" onClick={() => localizacao.pedir(marcarLocal)}
                                        disabled={enviando || localizacao.situacao === "buscando"}>
                                        {localizacao.situacao === "buscando" ? "Buscando..." : "Usar minha localização"}
                                    </Button>
                                    {ponto && <Text fontSize="sm" color="green.600">Local marcado.</Text>}
                                    {localizacao.situacao === "negada" && (
                                        <Text fontSize="sm">Permissão negada: marque o local clicando no mapa.</Text>
                                    )}
                                </HStack>
                                <Field.ErrorText>{erros.lat}</Field.ErrorText>
                            </Field.Root>

                            <Text fontStyle="italic" fontWeight="medium" pt="2">Informações do animal</Text>
                            <HStack align="start">
                                {campoTexto("nomeAnimal", "Nome", { placeholder: "Insira o nome do animal" })}
                                {campoSelect("especieId", "Espécie", deNomes(opcoes.especies), true)}
                            </HStack>
                            <HStack align="start">
                                {campoSelect("sexoId", "Sexo", deNomes(opcoes.sexos))}
                                {campoTexto("raca", "Raça", { placeholder: "Insira a raça do animal" })}
                            </HStack>
                            <HStack align="start">
                                {campoSelect("porteId", "Porte", deNomes(opcoes.portes))}
                            </HStack>
                        </Stack>
                    </Card.Body>
                    <Card.Footer colorPalette="orange" justifyContent="space-between">
                        <Button variant="outline" onClick={() => navigate(-1)} disabled={enviando}>Voltar</Button>
                        <Button type="submit" disabled={enviando}>{enviando ? "Criando..." : "Criar"}</Button>
                    </Card.Footer>
                </form>
            </Card.Root>
        </Box>
    );
}
