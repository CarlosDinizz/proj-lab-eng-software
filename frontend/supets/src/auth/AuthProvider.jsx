import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { apagarSessao, lerSessao, salvarSessao, tempoRestante } from "./sessao";

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(() => lerSessao());

    const entrar = useCallback((sessao) => {
        salvarSessao(sessao);
        setUsuario(sessao);
    }, []);

    const sair = useCallback(() => {
        apagarSessao();
        setUsuario(null);
    }, []);

    // Desloga sozinho quando o token vencer
    useEffect(() => {
        if (!usuario) return;
        const timer = setTimeout(sair, tempoRestante(usuario.token));
        return () => clearTimeout(timer);
    }, [usuario, sair]);

    const valor = useMemo(() => ({ usuario, entrar, sair }), [usuario, entrar, sair]);

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
