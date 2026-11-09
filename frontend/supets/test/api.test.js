import { test } from "node:test";
import assert from "node:assert/strict";
import { criarApi } from "../src/auth/api.js";

function fetchFalso(status = 200) {
    const chamadas = [];
    const fetchImpl = async (caminho, opcoes) => {
        chamadas.push({ caminho, opcoes });
        return { status };
    };
    return { chamadas, fetchImpl };
}

test("envia o token e preserva as opções da chamada", async () => {
    const { chamadas, fetchImpl } = fetchFalso();
    const api = criarApi({ token: "abc", fetchImpl });

    await api("/ocorrencia/api/v1", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });

    const { opcoes } = chamadas[0];
    assert.equal(opcoes.headers.get("Authorization"), "Bearer abc");
    assert.equal(opcoes.headers.get("Content-Type"), "application/json");
    assert.equal(opcoes.method, "POST");
    assert.equal(opcoes.body, "{}");
});

test("sem token, não envia Authorization", async () => {
    const { chamadas, fetchImpl } = fetchFalso();

    await criarApi({ token: undefined, fetchImpl })("/ocorrencia/api/v1");

    assert.equal(chamadas[0].opcoes.headers.has("Authorization"), false);
});

test("não envia o token para outro site", async () => {
    const { chamadas, fetchImpl } = fetchFalso();
    const api = criarApi({ token: "abc", fetchImpl });

    await api("https://outro-site.example/api");
    await api("//outro-site.example/api");

    assert.equal(chamadas[0].opcoes.headers.has("Authorization"), false);
    assert.equal(chamadas[1].opcoes.headers.has("Authorization"), false);
});

test("avisa que a sessão é inválida só quando um 401 responde a uma chamada com token", async () => {
    let avisos = 0;
    const aoSessaoInvalida = () => { avisos += 1; };

    await criarApi({ token: "abc", aoSessaoInvalida, fetchImpl: fetchFalso(401).fetchImpl })("/ocorrencia/api/v1");
    assert.equal(avisos, 1);

    await criarApi({ token: undefined, aoSessaoInvalida, fetchImpl: fetchFalso(401).fetchImpl })("/ocorrencia/api/v1");
    await criarApi({ token: "abc", aoSessaoInvalida, fetchImpl: fetchFalso(403).fetchImpl })("/ocorrencia/api/v1");
    assert.equal(avisos, 1);
});
