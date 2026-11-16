import { useEffect, useState } from "react";

/** Cada execução pertence à sua chave; cancelamento também ignora respostas já em processamento. */
export function useRecurso(api, caminho) {
    const [tentativa, setTentativa] = useState(0);
    const [resultado, setResultado] = useState(null);
    useEffect(() => {
        if (!caminho) return;
        const controller = new AbortController();
        const atual = () => !controller.signal.aborted;
        api(caminho, { signal: controller.signal }).then(async (resposta) => {
            if (resposta.status === 404) {
                if (atual()) setResultado({ caminho, tentativa, status: "not-found" });
                return;
            }
            if (!resposta.ok) throw new Error();
            const dados = await resposta.json();
            if (atual()) setResultado({ caminho, tentativa, status: "ready", dados });
        }).catch((erro) => {
            if (atual() && erro.name !== "AbortError") setResultado({ caminho, tentativa, status: "error" });
        });
        return () => controller.abort();
    }, [api, caminho, tentativa]);
    const vigente = caminho && resultado?.caminho === caminho && resultado.tentativa === tentativa;
    return {
        status: vigente ? resultado.status : "loading",
        dados: vigente && resultado.status === "ready" ? resultado.dados : null,
        recarregar: () => setTentativa((anterior) => anterior + 1),
    };
}
