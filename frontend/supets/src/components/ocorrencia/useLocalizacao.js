import { useCallback, useState } from "react";

/**
 * Pede ao navegador a localização da pessoa (ele mostra o aviso de permissão).
 * situacao: "inicial" | "buscando" | "ok" | "negada" | "indisponivel"
 * pedir(aoEncontrar): aoEncontrar recebe {lat, lon} quando a localização chega.
 */
export function useLocalizacao() {
    const [local, setLocal] = useState(null);
    const [situacao, setSituacao] = useState("inicial");

    const pedir = useCallback((aoEncontrar) => {
        if (!navigator.geolocation) {
            setSituacao("indisponivel");
            return;
        }
        setSituacao("buscando");
        navigator.geolocation.getCurrentPosition(
            (posicao) => {
                const encontrado = { lat: posicao.coords.latitude, lon: posicao.coords.longitude };
                setLocal(encontrado);
                setSituacao("ok");
                aoEncontrar?.(encontrado);
            },
            (erro) => setSituacao(erro.code === erro.PERMISSION_DENIED ? "negada" : "indisponivel"),
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }, []);

    return { local, situacao, pedir };
}
