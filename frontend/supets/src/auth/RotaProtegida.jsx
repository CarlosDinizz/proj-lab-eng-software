import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

/**
 * Só mostra a tela para quem está logado; com `perfil`, só para aquele perfil ("CIDADAO" ou "ONG").
 * Uso: <Route path="/campanhas/nova" element={<RotaProtegida perfil="ONG"><NovaCampanha /></RotaProtegida>} />
 */
export function RotaProtegida({ perfil, children }) {
    const { usuario } = useAuth();
    const location = useLocation();

    if (!usuario) return <Navigate to="/login" replace state={{ de: location.pathname }} />;
    if (perfil && usuario.perfil !== perfil) return <Navigate to="/" replace />;
    return children;
}
