import { test } from "node:test";
import assert from "node:assert/strict";
import {
    LISTAS, VALORES_INICIAIS, errosDoBack, filtrarCampanhas, montarCorpo, podeEditar, podeParticipar, situacao, validar,
    valoresDe, hojeCampanha,
} from "../src/components/campanha/campanhas.js";

const HOJE = "2026-09-15";

const preenchido = {
    ...VALORES_INICIAIS,
    titulo: "  Vacinação Antirrábica ",
    descricao: " Campanha gratuita de vacinação contra a raiva para cães e gatos. ",
    dataInicio: "2026-09-20",
    dataFim: "2026-09-25",
    tipoCampanhaId: "1",
    cep: "23832-231",
    endereco: "Rua das Flores, 150",
    cidade: "Campinas",
    estado: "SP",
};

const vacinacao = { id: "a", titulo: "Vacinação Antirrábica", estado: "SP", cidade: "São Paulo", dataInicio: "2026-09-20", dataFim: "2026-09-25" };
const campinas = { id: "b", titulo: "Vacinação Antirrábica", estado: "SP", cidade: "Campinas", dataInicio: "2026-09-22", dataFim: "2026-09-25" };
const feira = { id: "c", titulo: "Feira de adoção", estado: "RJ", cidade: "Niterói", dataInicio: "2026-09-10", dataFim: "2026-09-10" };

test("formulário preenchido como no wireframe passa na validação", () => {
    assert.deepEqual(validar(preenchido, HOJE), {});
});

test("formulário vazio aponta todos os campos", () => {
    const erros = validar(VALORES_INICIAIS, HOJE);
    assert.deepEqual(Object.keys(erros).sort(),
        ["cep", "cidade", "dataFim", "dataInicio", "descricao", "endereco", "estado", "tipoCampanhaId", "titulo"]);
});

test("datas: início não pode ser no passado e fim não pode vir antes do início", () => {
    assert.ok(validar({ ...preenchido, dataInicio: "2026-09-14" }, HOJE).dataInicio);
    assert.equal(validar({ ...preenchido, dataInicio: HOJE, dataFim: HOJE }, HOJE).dataInicio, undefined);
    assert.ok(validar({ ...preenchido, dataFim: "2026-09-19" }, HOJE).dataFim);
});

test("CEP precisa ter 8 dígitos", () => {
    assert.ok(validar({ ...preenchido, cep: "2383" }, HOJE).cep);
});

test("monta o corpo com texto aparado, CEP só com dígitos e tipo numérico", () => {
    assert.deepEqual(montarCorpo(preenchido), {
        titulo: "Vacinação Antirrábica",
        descricao: "Campanha gratuita de vacinação contra a raiva para cães e gatos.",
        dataInicio: "2026-09-20",
        dataFim: "2026-09-25",
        tipoCampanhaId: 1,
        cep: "23832231",
        endereco: "Rua das Flores, 150",
        cidade: "Campinas",
        estado: "SP",
    });
});

test("erros do back: só as mensagens de texto", () => {
    assert.deepEqual(errosDoBack({ dataFim: "Data inválida.", detalhes: { a: 1 } }), { dataFim: "Data inválida." });
    assert.deepEqual(errosDoBack(null), {});
});

test("filtro por título e cidade ignora acento e caixa; estado é exato", () => {
    const todas = [vacinacao, campinas, feira];
    assert.deepEqual(filtrarCampanhas(todas, {}), todas);
    assert.deepEqual(filtrarCampanhas(todas, { busca: "VACINACAO" }), [vacinacao, campinas]);
    assert.deepEqual(filtrarCampanhas(todas, { estado: "SP", cidade: "sao" }), [vacinacao]);
    assert.deepEqual(filtrarCampanhas(todas, { cidade: "niteroi" }), [feira]);
});

test("situação pela data", () => {
    assert.equal(situacao(vacinacao, HOJE).texto, "Em breve");
    assert.equal(situacao(vacinacao, "2026-09-25").texto, "Acontecendo");
    assert.equal(situacao(feira, HOJE).texto, "Encerrada");
});

test("só cidadão participa, uma vez, e antes de a campanha terminar", () => {
    const cidadao = { id: "1", perfil: "CIDADAO" };
    assert.equal(podeParticipar(vacinacao, cidadao, HOJE), true);
    assert.equal(podeParticipar({ ...vacinacao, participando: true }, cidadao, HOJE), false);
    assert.equal(podeParticipar(feira, cidadao, HOJE), false);
    assert.equal(podeParticipar(vacinacao, { id: "2", perfil: "ONG" }, HOJE), false);
    assert.equal(podeParticipar(null, cidadao, HOJE), false);
});

test("caminhos das listas", () => {
    assert.equal(LISTAS.todas.caminho, "/community/campanha/api/v1");
    assert.equal(LISTAS.minhas.caminho, "/community/campanha/api/v1/minhas");
    assert.equal(LISTAS.participadas.caminho, "/community/campanha/api/v1/participadas");
});

test("edição: campanha que já começou pode manter a data de início, mas não mudar para outra no passado", () => {
    const comecou = { ...preenchido, dataInicio: "2026-09-10" };
    assert.equal(validar(comecou, HOJE, "2026-09-10").dataInicio, undefined);
    assert.ok(validar(comecou, HOJE, "2026-09-12").dataInicio);
    assert.ok(validar(comecou, HOJE).dataInicio);
});

test("preenche o formulário de edição com a campanha do back", () => {
    const valores = valoresDe({ ...vacinacao, descricao: "d", tipoCampanhaId: 1, cep: "23832231", endereco: "Rua" });
    assert.equal(valores.cep, "23832-231");
    assert.equal(valores.tipoCampanhaId, "1");
    assert.equal(valores.dataInicio, "2026-09-20");
    assert.deepEqual(validar(valores, HOJE), {});
});

test("só a ONG que criou edita", () => {
    const campanha = { ...vacinacao, ongId: "ong-1" };
    assert.equal(podeEditar(campanha, { id: "ong-1", perfil: "ONG" }), true);
    assert.equal(podeEditar(campanha, { id: "ong-2", perfil: "ONG" }), false);
    assert.equal(podeEditar(campanha, { id: "ong-1", perfil: "CIDADAO" }), false);
    assert.equal(podeEditar(null, { id: "ong-1", perfil: "ONG" }), false);
});

test("calendário da campanha usa Brasília, inclusive na virada UTC", () => {
    assert.equal(hojeCampanha(new Date("2026-11-17T01:00:00Z")), "2026-11-16");
    assert.equal(hojeCampanha(new Date("2026-11-17T03:00:00Z")), "2026-11-17");
    assert.equal(hojeCampanha(new Date("2027-01-01T02:59:59Z")), "2026-12-31");
    const c = { dataInicio: "2026-11-16", dataFim: "2026-11-16" };
    assert.equal(podeParticipar(c, { perfil: "CIDADAO" }, hojeCampanha(new Date("2026-11-17T01:00Z"))), true);
    assert.equal(podeParticipar(c, { perfil: "CIDADAO" }, hojeCampanha(new Date("2026-11-17T03:00Z"))), false);
});

test("UF inválida não passa na validação da campanha", () => {
    assert.ok(validar({ ...preenchido, estado: "ZZ" }, HOJE).estado);
});