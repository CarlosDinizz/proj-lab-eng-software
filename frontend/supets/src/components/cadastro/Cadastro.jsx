import { useEffect, useRef, useState } from "react";
import { Box, Button, Card, Tabs } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { CadastroCidadao } from "./CadastroCidadao";
import { CadastroOng } from "./CadastroOng";
import { useNavigate } from "react-router-dom";
import { normalizarCpf, normalizarCnpj, validarCadastro } from "./cadastro";
import { normalizarUf } from "@/shared/endereco";

export function Cadastro() {
    const navigate = useNavigate();
    const [tipo, setTipo] = useState("cidadao");
    const [valores, setValores] = useState({ cidadao: {}, ong: {} });
    const [enviando, setEnviando] = useState(false);
    const [erros, setErros] = useState({});
    const [enderecoValido, setEnderecoValido] = useState(false);
    const pendente = useRef(false);
    const ativa = useRef(true);
    useEffect(() => { ativa.current = true; return () => { ativa.current = false; }; }, []);

    function alterar(event) {
        const { name, value } = event.target;
        setValores((anteriores) => ({ ...anteriores, [tipo]: { ...anteriores[tipo], [name]: value } }));
        setErros((anteriores) => ({ ...anteriores, [name]: undefined }));
    }

    async function cadastrar(event) {
        event.preventDefault();
        if (pendente.current || !enderecoValido) return;
        const dados = valores[tipo];
        const errosLocais = validarCadastro(dados, tipo);
        setErros(errosLocais);
        if (Object.keys(errosLocais).length) {
            toaster.create({ title: "Não foi possível cadastrar", description: "Confira os campos destacados.", type: "error" });
            return;
        }

        pendente.current = true;
        setEnviando(true);
        try {
            const resposta = await fetch(`/community/${tipo}/api/v1`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...dados, estado: normalizarUf(dados.estado),
                    municipio: dados.municipio,
                    ...(tipo === "cidadao" ? { cpf: normalizarCpf(dados.cpf) } : { cnpj: normalizarCnpj(dados.cnpj) }) }),
            });
            if (!ativa.current) return;
            if (!resposta.ok) {
                const mensagens = await resposta.json().catch(() => ({}));
                setErros(mensagens);
                throw new Error(Object.values(mensagens).filter((valor) => typeof valor === "string").join("; ") || "Tente novamente.");
            }
            toaster.create({ title: "Cadastro realizado com sucesso!", type: "success" });
            navigate("/");
        } catch (error) {
            if (ativa.current) toaster.create({ title: "Não foi possível cadastrar", description: error.message, type: "error" });
        } finally {
            pendente.current = false;
            if (ativa.current) setEnviando(false);
        }
    }

    return (
        <Box display="flex" justifyContent="center" alignItems="center" px="4" minHeight="900px">
            <Card.Root maxWidth="xl" width="full" mx="auto">
                <form onSubmit={cadastrar} noValidate>
                    <Tabs.Root value={tipo} onValueChange={(event) => { setTipo(event.value); setErros({}); setEnderecoValido(false); }} variant="enclosed" colorPalette="purple">
                        <Card.Header>
                            <Card.Title>Fazer cadastro</Card.Title>
                            <Tabs.List mt="4">
                                <Tabs.Trigger value="cidadao" width="full" disabled={enviando}>Cidadão</Tabs.Trigger>
                                <Tabs.Trigger value="ong" width="full" disabled={enviando}>ONG</Tabs.Trigger>
                            </Tabs.List>
                        </Card.Header>
                        <Card.Body>
                            <Tabs.Content value="cidadao">{tipo === "cidadao" && <CadastroCidadao valores={valores.cidadao} onChange={alterar} erros={erros} disabled={enviando} onStatus={setEnderecoValido} />}</Tabs.Content>
                            <Tabs.Content value="ong">{tipo === "ong" && <CadastroOng valores={valores.ong} onChange={alterar} erros={erros} disabled={enviando} onStatus={setEnderecoValido} />}</Tabs.Content>
                        </Card.Body>
                        <Card.Footer colorPalette="orange" justifyContent="flex-end">
                            <Button type="submit" disabled={enviando || !enderecoValido}>{enviando ? "Cadastrando..." : "Cadastrar"}</Button>
                        </Card.Footer>
                    </Tabs.Root>
                </form>
            </Card.Root>
        </Box>
    );
}
