import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarCpf, normalizarCnpj, cpfValido, cnpjValido, validarCadastro } from "../src/components/cadastro/cadastro.js";

// Documentos sintéticos servem apenas ao teste de checksum, nunca como prova de identidade.
function cpfSintetico(base) {
    let cpf = base;
    for (const tamanho of [9, 10]) {
        const resto = [...cpf].reduce((soma, numero, i) => soma + Number(numero) * (tamanho + 1 - i), 0) % 11;
        cpf += resto < 2 ? "0" : String(11 - resto);
    }
    return cpf;
}
const cadastro = {
    nome: "Pessoa de teste", cpf: cpfSintetico("123456789"), cep: "01001-000",
    endereco: "Endereço fictício", municipio: "São Paulo", estado: "SP", email: "teste@example.invalid", senha: "abcdefg1",
};

test("CPF exige 11 dígitos, dois verificadores corretos e não repetição", () => {
    assert.equal(cpfValido("529.982.247-25"), true);
    for (const base of ["123456789", "876543210", "000000001", "981234567"]) {
        const cpf = cpfSintetico(base);
        assert.equal(cpfValido(cpf), true);
        assert.equal(cpfValido(cpf.slice(0, 10) + ((Number(cpf[10]) + 1) % 10)), false);
    }
    for (let i = 0; i <= 9; i++) assert.equal(cpfValido(String(i).repeat(11)), false);
    for (const cpf of ["123", "5299822472A", "529982247255", "529/98224725", "52998224724", null]) assert.equal(cpfValido(cpf), false);
    assert.equal(normalizarCpf(" 529.982.247-25 "), "52998224725");
});

test("CNPJ numérico e fixture oficial alfanumérica usam ASCII menos 48", () => {
    assert.equal(cnpjValido("11.222.333/0001-81"), true);
    assert.equal(cnpjValido("12.ABC.345/01DE-35"), true);
    assert.equal(cnpjValido(" 12.abc.345/01de-35 "), true);
    assert.equal(normalizarCnpj(" 12.abc.345/01de-35 "), "12ABC34501DE35");
    for (let i = 0; i <= 9; i++) assert.equal(cnpjValido(String(i).repeat(14)), false);
    for (const cnpj of ["12.ABC.345/01DE-34", "12.ABC.345/01DE-3A", "12.ÁBC.345/01DE-35", "12_ABC34501DE35", "11222333000180", "12ABC34501DE350", null]) {
        assert.equal(cnpjValido(cnpj), false, String(cnpj));
    }
});

test("cadastro usa as mesmas regras e preserva chaves de erro de documento e UF", () => {
    assert.deepEqual(validarCadastro(cadastro, "cidadao"), {});
    assert.deepEqual(validarCadastro({ ...cadastro, cnpj: "12.ABC.345/01DE-35" }, "ong"), {});
    assert.ok(validarCadastro({ ...cadastro, cpf: "00000000000" }, "cidadao").cpf);
    assert.ok(validarCadastro({ ...cadastro, cnpj: "00000000000000" }, "ong").cnpj);
    assert.ok(validarCadastro({ ...cadastro, estado: "ZZ" }, "cidadao").estado);
});

test("senha mantém 8 caracteres e a fronteira BCrypt de 72 bytes UTF-8", () => {
    assert.equal(validarCadastro({ ...cadastro, senha: "abcdef1" }, "cidadao").senha != null, true);
    assert.equal(validarCadastro({ ...cadastro, senha: "á".repeat(35) + "a1" }, "cidadao").senha, undefined);
    assert.ok(validarCadastro({ ...cadastro, senha: "á".repeat(36) + "a1" }, "cidadao").senha);
    assert.ok(validarCadastro({ ...cadastro, senha: "abcdefgh" }, "cidadao").senha);
    assert.ok(validarCadastro({ ...cadastro, senha: "12345678" }, "cidadao").senha);
});
