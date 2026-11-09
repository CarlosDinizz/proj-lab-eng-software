/**
 * Cria a função de requisição autenticada.
 * Ela anexa o token às chamadas para o próprio site e avisa quando o back recusa a sessão (401).
 */
export function criarApi({ token, aoSessaoInvalida, fetchImpl = fetch }) {
    return async function api(caminho, opcoes = {}) {
        const headers = new Headers(opcoes.headers);
        // O token só acompanha caminhos internos ("/..."), nunca um endereço de outro site.
        const interno = typeof caminho === "string" && caminho.startsWith("/") && !caminho.startsWith("//");
        const autenticada = Boolean(token) && interno;
        if (autenticada) headers.set("Authorization", `Bearer ${token}`);

        const resposta = await fetchImpl(caminho, { ...opcoes, headers });
        if (resposta.status === 401 && autenticada) aoSessaoInvalida?.();
        return resposta;
    };
}
