import { test } from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { destinoInterno, lerSessao, salvarSessao, apagarSessao, tempoRestante, tokenExpirado } from "../src/auth/sessao.js";

const tokenCom = (exp) => `cabecalho.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.assinatura`;
const agoraEmSegundos = () => Math.floor(Date.now() / 1000);

function storageFalso() {
    const dados = new Map();
    return {
        getItem: (chave) => dados.get(chave) ?? null,
        setItem: (chave, valor) => dados.set(chave, valor),
        removeItem: (chave) => dados.delete(chave),
    };
}

test("token com exp no futuro não está expirado; no passado ou inválido, está", () => {
    assert.equal(tokenExpirado(tokenCom(agoraEmSegundos() + 3600)), false);
    assert.equal(tokenExpirado(tokenCom(agoraEmSegundos() - 1)), true);
    assert.equal(tokenExpirado("nao-e-um-jwt"), true);
});

test("salva, lê e apaga a sessão", () => {
    const storage = storageFalso();
    const sessao = { token: tokenCom(agoraEmSegundos() + 3600), id: "1", nome: "Pedro", perfil: "CIDADAO" };
    salvarSessao(sessao, storage);
    assert.deepEqual(lerSessao(storage), sessao);
    apagarSessao(storage);
    assert.equal(lerSessao(storage), null);
});

test("descarta sessão vencida ou corrompida", () => {
    const storage = storageFalso();
    salvarSessao({ token: tokenCom(agoraEmSegundos() - 10), nome: "Pedro" }, storage);
    assert.equal(lerSessao(storage), null);
    assert.equal(storage.getItem("supets.sessao"), null);

    storage.setItem("supets.sessao", "{isso não é json");
    assert.equal(lerSessao(storage), null);
});

test("exp não finito no JSON original e overflow de milissegundos vencem localmente", () => {
    for (const json of ['{"exp":1e309}', '{"exp":-1e309}', '{"exp":1e308}', '{"exp":"9999999999"}', '{"exp":null}', '{}']) {
        const token = `cabecalho.${Buffer.from(json).toString("base64url")}.assinatura`;
        assert.equal(tokenExpirado(token, 0), true, json);
        assert.equal(tempoRestante(token, 0), -1, json);
        const storage = storageFalso();
        salvarSessao({ token }, storage);
        assert.equal(lerSessao(storage), null, json);
    }
    assert.equal(tempoRestante(tokenCom(2), 1000), 1000);
    assert.equal(tokenExpirado(tokenCom(2), 2000), true);
});

test("destino de retorno mantém caminho, busca e fragmento internos", () => {
    assert.equal(destinoInterno("/ocorrencias/abc/editar?origem=minhas#animal"), "/ocorrencias/abc/editar?origem=minhas#animal");
    assert.equal(destinoInterno("/campanhas?cidade=S%C3%A3o%20Paulo#lista"), "/campanhas?cidade=S%C3%A3o%20Paulo#lista");
    assert.equal(destinoInterno("/a/../campanhas"), "/campanhas");
});

test("destino de retorno recusa externos, controles, barras invertidas e loops de login", () => {
    for (const destino of [null, {}, "", "campanhas", "https://evil.example", "//evil.example",
        "/\\evil.example", "/a\\b", "/a\nb", "/a\tb", "/a b", "/%2f%2fevil.example",
        "/%5cevil.example", "/%00", "/%0a", "/login", "/login?de=/campanhas", "/LOGIN#x",
        "/a/../login", "/%6cogin", "/login/", "/%zz", "/campanhas?x=%0a", "/campanhas#%5c"]) {
        assert.equal(destinoInterno(destino), "/", String(destino));
    }
});
