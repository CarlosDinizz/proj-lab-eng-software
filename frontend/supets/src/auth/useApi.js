import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";
import { criarApi } from "./api";
import { useAuth } from "./useAuth";

/**
 * Devolve um `fetch` que já envia o token do usuário logado.
 * Uso: const api = useApi(); const resposta = await api("/ocorrencia/api/v1", { method: "POST", ... });
 */
export function useApi() {
    const { usuario, sair } = useAuth();
    const navigate = useNavigate();
    const token = usuario?.token;

    return useMemo(() => criarApi({
        token,
        aoSessaoInvalida: () => {
            sair();
            toaster.create({ title: "Sua sessão expirou", description: "Faça login novamente.", type: "info" });
            navigate("/login");
        },
    }), [token, sair, navigate]);
}
