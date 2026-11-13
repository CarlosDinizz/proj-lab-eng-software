import { test } from "node:test";
import assert from "node:assert/strict";
import {
    VALORES_INICIAIS, acoesPermitidas, caminhoDaLista, distanciaKm, errosDoBack, formatarCep,
    formatarData, formatarDistancia, hoje, montarCorpo, validar,
} from "../src/components/ocorrencia/ocorrencias.js";

const preenchido = {
    ...VALORES_INICIAIS,
    titulo: "  Cachorro desaparecido no bairro Moema ",
    descricao: "Atende pelo nome de Thor.",
    dataOcorrido: "2026-09-13",
    tipoOcorrenciaId: "2",
    cep: "04094-050",
    endereco: "Av. Ibirapuera, 3103",
    cidade: "São Paulo",
    estado: "SP",
    lat: -23.601, lon: -46.665,
    especieId: "1",
};

test("formulário vazio aponta todos os obrigatórios e o local no mapa", () => {
    const erros = validar(VALORES_INICIAIS, "2026-11-10");
    assert.deepEqual(Object.keys(erros).sort(), [
        "cep", "cidade", "dataOcorrido", "descricao", "endereco", "especieId", "estado", "lat", "tipoOcorrenciaId", "titulo",
    ]);
});

test("formulário preenchido não tem erros", () => {
    assert.deepEqual(validar(preenchido, "2026-11-10"), {});
});

test("só espaços conta como vazio", () => {
    assert.ok(validar({ ...preenchido, titulo: "   " }, "2026-11-10").titulo);
});

test("recusa data no futuro, CEP incompleto e título longo", () => {
    const erros = validar({ ...preenchido, dataOcorrido: "2026-11-11", cep: "0409", titulo: "a".repeat(256) }, "2026-11-10");
    assert.ok(erros.dataOcorrido);
    assert.ok(erros.cep);
    assert.ok(erros.titulo);
    assert.equal(validar({ ...preenchido, dataOcorrido: "2026-11-10" }, "2026-11-10").dataOcorrido, undefined);
});

test("hoje usa o formato do input de data", () => {
    assert.equal(hoje(new Date(2026, 0, 5)), "2026-01-05");
});

test("formata o CEP enquanto digita", () => {
    assert.equal(formatarCep("04094"), "04094");
    assert.equal(formatarCep("04094050"), "04094-050");
    assert.equal(formatarCep("04094-0501234abc"), "04094-050");
});

test("monta o corpo com o animal separado e sem opcionais vazios", () => {
    const corpo = montarCorpo({ ...preenchido, raca: " Golden retriever ", porteId: "3" });
    assert.equal(corpo.titulo, "Cachorro desaparecido no bairro Moema");
    assert.equal(corpo.tipoOcorrenciaId, 2);
    assert.equal(corpo.cep, "04094050");
    assert.equal(corpo.lat, -23.601);
    assert.deepEqual(corpo.animal, { nome: undefined, especieId: 1, sexoId: undefined, raca: "Golden retriever", porteId: 3 });
    // JSON.stringify descarta os undefined: o back recebe só o que foi preenchido
    assert.equal(JSON.stringify(corpo.animal), '{"especieId":1,"raca":"Golden retriever","porteId":3}');
});

test("traduz os erros do back para os campos da tela", () => {
    assert.deepEqual(errosDoBack({ "animal.especieId": "Espécie não encontrada.", "animal.nome": "x", lon: "y", cep: "z", message: "m" }),
        { especieId: "Espécie não encontrada.", nomeAnimal: "x", lat: "y", cep: "z", message: "m" });
});

const usuario = { id: "eu" };
const ocorrencia = (status, cidadaoId = "outro", responsavelId = null) => ({ status, cidadaoId, responsavelId });

test("qualquer pessoa logada pode assumir uma ocorrência aberta", () => {
    assert.deepEqual(acoesPermitidas(ocorrencia("ABERTA"), usuario), { assumir: true, resolver: false });
    assert.deepEqual(acoesPermitidas(ocorrencia("ABERTA"), null), { assumir: false, resolver: false });
});

test("quem registrou pode resolver direto; quem assumiu resolve depois", () => {
    assert.equal(acoesPermitidas(ocorrencia("ABERTA", "eu"), usuario).resolver, true);
    assert.equal(acoesPermitidas(ocorrencia("EM_ANDAMENTO", "outro", "eu"), usuario).resolver, true);
    assert.equal(acoesPermitidas(ocorrencia("EM_ANDAMENTO", "eu", "ong"), usuario).resolver, true);
    assert.deepEqual(acoesPermitidas(ocorrencia("EM_ANDAMENTO", "outro", "ong"), usuario), { assumir: false, resolver: false });
    assert.deepEqual(acoesPermitidas(ocorrencia("RESOLVIDA", "eu", "eu"), usuario), { assumir: false, resolver: false });
});

test("distância entre o centro de SP e Moema fica perto de 6 km", () => {
    const km = distanciaKm({ lat: -23.5505, lon: -46.6333 }, { lat: -23.601, lon: -46.665 });
    assert.ok(km > 5 && km < 7, `deu ${km}`);
    assert.equal(formatarDistancia(0.4), "400 m");
    assert.equal(formatarDistancia(6.42), "6,4 km");
});

test("formata a data no padrão brasileiro", () => {
    assert.equal(formatarData("2026-09-13"), "13/09/2026");
    assert.equal(formatarData(null), "");
});

test("monta o caminho da listagem conforme o filtro", () => {
    assert.equal(caminhoDaLista({}), "/ocorrencia/api/v1");
    assert.equal(caminhoDaLista({ minhas: true, status: "ABERTA" }), "/ocorrencia/api/v1/minhas");
    assert.equal(caminhoDaLista({ status: "ABERTA", local: { lat: -23.5, lon: -46.6 }, raioKm: 10 }),
        "/ocorrencia/api/v1?status=ABERTA&lat=-23.5&lon=-46.6&raioKm=10");
    assert.equal(caminhoDaLista({ local: { lat: -23.5, lon: -46.6 }, raioKm: null }), "/ocorrencia/api/v1");
});
