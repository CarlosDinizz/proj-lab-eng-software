import { useCallback, useEffect, useRef, useState } from "react";
import { pontoValido } from "./ocorrencias";

/**
 * Pede ao navegador a localização da pessoa (ele mostra o aviso de permissão).
 * situacao: "inicial" | "buscando" | "ok" | "negada" | "indisponivel" | "tempoEsgotado"
 * pedir(aoEncontrar): aoEncontrar recebe {lat, lon} quando a localização chega.
 */
export function useLocalizacao() {
    const [local, setLocal] = useState(null);
    const [situacao, setSituacao] = useState("inicial");
    const geracao = useRef(0);
    useEffect(() => () => { geracao.current++; }, []);

    const pedir = useCallback((aoEncontrar) => {
        const atual = ++geracao.current;
        if (!navigator.geolocation) {
            setSituacao("indisponivel");
            return;
        }
        setSituacao("buscando");
        navigator.geolocation.getCurrentPosition(
            (posicao) => {
                if (atual !== geracao.current) return;
                const encontrado = { lat: posicao.coords.latitude, lon: posicao.coords.longitude };
                if (!pontoValido(encontrado)) { setSituacao("indisponivel"); return; }
                setLocal(encontrado);
                setSituacao("ok");
                aoEncontrar?.(encontrado);
            },
            (erro) => {
                if (atual === geracao.current) setSituacao(erro.code === 1 ? "negada" : erro.code === 3 ? "tempoEsgotado" : "indisponivel");
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }, []);

    return { local, situacao, pedir };
}
