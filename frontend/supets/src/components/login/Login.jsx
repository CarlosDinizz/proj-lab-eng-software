import { useState } from "react";
import { Box, Button, Card, Field, Input, Link, Stack, Text } from "@chakra-ui/react";
import { Navigate, Link as RouterLink, useNavigate } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";
import { useAuth } from "@/auth/useAuth";

export function Login() {
    const navigate = useNavigate();
    const { usuario, entrar } = useAuth();
    const [valores, setValores] = useState({ email: "", senha: "" });
    const [enviando, setEnviando] = useState(false);

    // Quem já está logado não precisa ver a tela de login
    if (usuario) return <Navigate to="/" replace />;

    function alterar(event) {
        const { name, value } = event.target;
        setValores((anteriores) => ({ ...anteriores, [name]: value }));
    }

    async function login(event) {
        event.preventDefault();
        if (enviando) return;
        if (!valores.email.trim() || !valores.senha) {
            toaster.create({ title: "Não foi possível entrar", description: "Preencha e-mail e senha.", type: "error" });
            return;
        }

        setEnviando(true);
        try {
            const resposta = await fetch("/community/auth/api/v1/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(valores),
            });
            const corpo = await resposta.json().catch(() => ({}));
            if (!resposta.ok) {
                throw new Error(Object.values(corpo).filter((valor) => typeof valor === "string").join("; ") || "Tente novamente.");
            }
            entrar(corpo);
            toaster.create({ title: `Bem-vindo, ${corpo.nome}!`, type: "success" });
            navigate("/");
        } catch (error) {
            toaster.create({ title: "Não foi possível entrar", description: error.message, type: "error" });
        } finally {
            setEnviando(false);
        }
    }

    return (
        <Box height="500px" display="flex" justifyContent="center" alignItems="center" px="4">
            <Card.Root maxWidth="lg" width="full" mx="auto">
                <form onSubmit={login} noValidate>
                    <Card.Header>
                        <Card.Title>Login</Card.Title>
                        <Card.Description>Faça seu login como ONG ou Cidadão abaixo:</Card.Description>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap="4" w="full">
                            <Field.Root>
                                <Field.Label>E-mail</Field.Label>
                                <Input name="email" type="email" autoComplete="email" placeholder="Insira seu e-mail"
                                    value={valores.email} onChange={alterar} disabled={enviando} />
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Senha</Field.Label>
                                <Input name="senha" type="password" autoComplete="current-password" placeholder="Insira sua senha"
                                    value={valores.senha} onChange={alterar} disabled={enviando} />
                            </Field.Root>
                            <Text fontSize="sm">
                                Não tem conta?{" "}
                                <Link asChild colorPalette="purple"><RouterLink to="/cadastro">Cadastre-se</RouterLink></Link>
                            </Text>
                        </Stack>
                    </Card.Body>
                    <Card.Footer colorPalette="orange" justifyContent="flex-end">
                        <Button type="submit" disabled={enviando}>{enviando ? "Entrando..." : "Entrar"}</Button>
                    </Card.Footer>
                </form>
            </Card.Root>
        </Box>
    );
}
