import { useLayoutEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";
import { criarApi } from "./api";
import { useAuth } from "./useAuth";
import { destinoInterno } from "./sessao";

/**
 * Devolve um `fetch` que já envia o token do usuário logado.
 * Uso: const api = useApi(); const resposta = await api("/ocorrencia/api/v1", { method: "POST", ... });
 */
export function useApi() {
    const { usuario, sair } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const destino = useRef("/");
    const estaNoLogin = useRef(false);
    useLayoutEffect(() => {
        destino.current = destinoInterno(location.pathname + location.search + location.hash);
        estaNoLogin.current = location.pathname === "/login";
    }, [location.pathname, location.search, location.hash]);
    const token = usuario?.token;

    return useMemo(() => criarApi({
        token,
        aoSessaoInvalida: () => {
            if (estaNoLogin.current) return;
            sair();
            toaster.create({ title: "Sua sessão expirou", description: "Faça login novamente.", type: "info" });
            navigate("/login", { replace: true, state: { de: destino.current } });
        },
    }), [token, sair, navigate]);
}
