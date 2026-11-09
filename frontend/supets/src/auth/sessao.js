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
        return typeof exp === "number" ? exp * 1000 - agora : -1;
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
