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
        let timer;
        function agendar() {
            const restante = tempoRestante(usuario.token);
            if (restante <= 0) { sair(); return; }
            timer = setTimeout(agendar, Math.min(restante, 2_147_483_647));
        }
        agendar();
        return () => clearTimeout(timer);
    }, [usuario, sair]);

    const valor = useMemo(() => ({ usuario, entrar, sair }), [usuario, entrar, sair]);

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
