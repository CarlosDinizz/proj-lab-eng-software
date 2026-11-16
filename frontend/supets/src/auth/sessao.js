const CHAVE = "supets.sessao";

/** Lê o payload (parte do meio) do JWT. Não confere a assinatura: isso é trabalho do back. */
function lerPayload(token) {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
}

/** Milissegundos até o token vencer (negativo se já venceu). */
export function tempoRestante(token, agora = Date.now()) {
    try {
        const { exp } = lerPayload(token);
        const restante = exp * 1000 - agora;
        return typeof exp === "number" && Number.isFinite(exp) && Number.isFinite(restante) ? restante : -1;
    } catch {
        return -1;
    }
}

export function tokenExpirado(token, agora = Date.now()) {
    return tempoRestante(token, agora) <= 0;
}

/** Devolve a sessão salva, ou null se não houver ou se o token já venceu. */
export function lerSessao(storage = sessionStorage) {
    try {
        const sessao = JSON.parse(storage.getItem(CHAVE));
        if (sessao?.token && !tokenExpirado(sessao.token)) return sessao;
        storage.removeItem(CHAVE);
    } catch {
        // storage indisponível ou conteúdo corrompido: trata como deslogado
    }
    return null;
}

export function salvarSessao(sessao, storage = sessionStorage) {
    try { storage.setItem(CHAVE, JSON.stringify(sessao)); } catch { /* sem storage, a sessão vale só até recarregar */ }
}

export function apagarSessao(storage = sessionStorage) {
    try { storage.removeItem(CHAVE); } catch { /* nada a apagar */ }
}

/** Apenas rotas internas; nunca transforma um destino externo em navegação autenticada. */
export function destinoInterno(valor) {
    if (typeof valor !== "string" || !valor.startsWith("/") || valor.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(valor)) return "/";
    try {
        const url = new URL(valor, "https://supets.invalid");
        if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(valor))) return "/";
        if (url.origin !== "https://supets.invalid" || /^\/login(?:\/|$)/i.test(url.pathname)) return "/";
        // Rejeita também separadores/caracteres de controle codificados.
        const decodificado = decodeURIComponent(url.pathname);
        if (/[\\\u0000-\u0020\u007f]/.test(decodificado) || decodificado.startsWith("//") || /^\/login(?:\/|$)/i.test(decodificado)) return "/";
        return `${url.pathname}${url.search}${url.hash}`;
    } catch { return "/"; }
}
