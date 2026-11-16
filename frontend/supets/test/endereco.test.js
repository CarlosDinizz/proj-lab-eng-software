import { test } from "node:test";
import assert from "node:assert/strict";
import { carregarMunicipios, cidadeCanonica, ESTADOS, normalizarUf, ufValida, validarEndereco } from "../src/shared/endereco.js";
import dados from "../../../shared/data/municipios.json" with { type: "json" };

test("snapshot offline contém todas as UFs, nomes únicos e municípios reais", () => {
    assert.equal(ESTADOS.length, 27);
    assert.deepEqual(Object.keys(dados).sort(), [...ESTADOS].sort());
    let total = 0;
    for (const uf of ESTADOS) {
        assert.ok(dados[uf].length > 0, uf);
        assert.equal(new Set(dados[uf]).size, dados[uf].length, uf);
        assert.ok(dados[uf].every((nome) => typeof nome === "string" && nome === nome.trim() && nome === nome.normalize("NFC")), uf);
        total += dados[uf].length;
    }
    assert.equal(total, 5571);
    assert.ok(dados.SP.includes("São Paulo"));
    assert.ok(dados.DF.includes("Brasília"));
});

test("UF normaliza caixa e espaços; município respeita UF e acentos canônicos", () => {
    assert.equal(normalizarUf(" sp "), "SP");
    assert.equal(ufValida("sp"), true);
    assert.equal(ufValida("ZZ"), false);
    assert.equal(ufValida(null), false);
    assert.equal(cidadeCanonica(dados, " sp ", "  SÃO PAULO  "), "São Paulo");
    assert.equal(cidadeCanonica(dados, "SP", "Sa\u0303o Paulo"), "São Paulo");
    assert.equal(cidadeCanonica(dados, "RJ", "São Paulo"), null);
    assert.equal(cidadeCanonica(dados, "SP", "Sao Paulo"), null);
    assert.deepEqual(validarEndereco(dados, "SP", "São Paulo"), {});
    assert.deepEqual(Object.keys(validarEndereco(dados, "ZZ", "São Paulo")), ["estado"]);
    assert.deepEqual(Object.keys(validarEndereco(dados, "RJ", "São Paulo", "municipio")), ["municipio"]);
    assert.deepEqual(Object.keys(validarEndereco(dados, "RJ", "São Paulo")), ["cidade"]);
});

test("catálogo recupera falhas HTTP, JSON inválido e resposta vazia na próxima tentativa", async (t) => {
    const respostas = [
        new Response("indisponível", { status: 503 }),
        new Response("não é JSON"),
        Response.json({}),
        Response.json(dados),
    ];
    t.mock.method(globalThis, "fetch", async () => respostas.shift());
    for (let tentativa = 0; tentativa < 3; tentativa++) {
        await assert.rejects(carregarMunicipios());
    }
    const recuperado = await carregarMunicipios();
    assert.equal(cidadeCanonica(recuperado, "SP", "são paulo"), "São Paulo");
    assert.equal(cidadeCanonica(recuperado, "RJ", "rio de janeiro"), "Rio de Janeiro");
});
