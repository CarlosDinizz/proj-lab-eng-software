import { useState } from "react";
import { Box, Button, Card, Tabs } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { CadastroCidadao } from "./CadastroCidadao";
import { CadastroOng } from "./CadastroOng";
import { useNavigate } from "react-router-dom";

export function Cadastro() {
    const navigate = useNavigate();
    const [tipo, setTipo] = useState("cidadao");
    const [valores, setValores] = useState({ cidadao: {}, ong: {} });
    const [enviando, setEnviando] = useState(false);

    function alterar(event) {
        const { name, value } = event.target;
        setValores((anteriores) => ({ ...anteriores, [tipo]: { ...anteriores[tipo], [name]: value } }));
    }

    async function cadastrar(event) {
        event.preventDefault();
        if (enviando) return;
        const dados = valores[tipo];
        const documento = tipo === "cidadao" ? "cpf" : "cnpj";
        const campos = ["nome", documento, "cep", "endereco", "municipio", "estado", "email", "senha"];
        let erro = "";
        if (campos.some((campo) => !dados[campo]?.trim())) erro = "Preencha todos os campos.";
        else if (!new RegExp(`^[0-9]{${tipo === "cidadao" ? 11 : 14}}$`).test(dados[documento].replace(/[.\-/ ]/g, ""))) erro = `Informe um ${documento.toUpperCase()} válido.`;
        else if (!/^[0-9]{8}$/.test(dados.cep.replace(/[.\-/ ]/g, ""))) erro = "Informe um CEP válido.";
        else if (!/^[a-zA-Z]{2}$/.test(dados.estado.trim())) erro = "Informe a sigla do estado com 2 letras.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) erro = "Informe um e-mail válido.";
        else if (!/(?=^[\s\S]{8,}$)(?=[\s\S]*\p{L})(?=[\s\S]*[0-9])/u.test(dados.senha)) erro = "A senha deve ter pelo menos 8 caracteres, com uma letra e um número.";
        else if (new TextEncoder().encode(dados.senha).length > 72) erro = "A senha deve ter no máximo 72 bytes em UTF-8.";
        if (erro) {
            toaster.create({ title: "Não foi possível cadastrar", description: erro, type: "error" });
            return;
        }

        setEnviando(true);
        try {
            const resposta = await fetch(`/community/${tipo}/api/v1`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados),
            });
            if (!resposta.ok) {
                const mensagens = await resposta.json().catch(() => ({}));
                throw new Error(Object.values(mensagens).filter((valor) => typeof valor === "string").join("; ") || "Tente novamente.");
            }
            toaster.create({ title: "Cadastro realizado com sucesso!", type: "success" });
            navigate("/");
        } catch (error) {
            toaster.create({ title: "Não foi possível cadastrar", description: error.message, type: "error" });
        } finally {
            setEnviando(false);
        }
    }

    return (
        <Box display="flex" justifyContent="center" alignItems="center" px="4" minHeight="900px">
            <Card.Root maxWidth="xl" width="full" mx="auto">
                <form onSubmit={cadastrar} noValidate>
                    <Tabs.Root value={tipo} onValueChange={(event) => setTipo(event.value)} variant="enclosed" colorPalette="purple">
                        <Card.Header>
                            <Card.Title>Fazer cadastro</Card.Title>
                            <Tabs.List mt="4">
                                <Tabs.Trigger value="cidadao" width="full" disabled={enviando}>Cidadão</Tabs.Trigger>
                                <Tabs.Trigger value="ong" width="full" disabled={enviando}>ONG</Tabs.Trigger>
                            </Tabs.List>
                        </Card.Header>
                        <Card.Body>
                            <Tabs.Content value="cidadao"><CadastroCidadao valores={valores.cidadao} onChange={alterar} /></Tabs.Content>
                            <Tabs.Content value="ong"><CadastroOng valores={valores.ong} onChange={alterar} /></Tabs.Content>
                        </Card.Body>
                        <Card.Footer colorPalette="orange" justifyContent="flex-end">
                            <Button type="submit" disabled={enviando}>{enviando ? "Cadastrando..." : "Cadastrar"}</Button>
                        </Card.Footer>
                    </Tabs.Root>
                </form>
            </Card.Root>
        </Box>
    );
}
