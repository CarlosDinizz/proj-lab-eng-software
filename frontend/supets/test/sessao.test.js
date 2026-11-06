import { test } from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { lerSessao, salvarSessao, apagarSessao, tokenExpirado } from "../src/auth/sessao.js";

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
