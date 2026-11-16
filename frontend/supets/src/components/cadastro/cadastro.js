import { ufValida } from "../../shared/endereco.js";

// Somente a máscara permitida é removida: letras e caracteres inválidos não desaparecem.
export const normalizarCpf = (valor) => String(valor ?? "").replace(/[.\-\s]/g, "");
export const normalizarCnpj = (valor) => String(valor ?? "").replace(/[.\/\-\s]/g, "").toUpperCase();
const digito = (soma) => soma % 11 < 2 ? 0 : 11 - soma % 11;

export function cpfValido(valor) {
    const cpf = normalizarCpf(valor);
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
    for (let tamanho = 9; tamanho <= 10; tamanho++) {
        let soma = 0;
        for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
        if (digito(soma) !== Number(cpf[tamanho])) return false;
    }
    return true;
}

export function cnpjValido(valor) {
    const cnpj = normalizarCnpj(valor);
    if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
    const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let tamanho = 12; tamanho <= 13; tamanho++) {
        let soma = 0;
        for (let i = 0; i < tamanho; i++) soma += (cnpj.charCodeAt(i) - 48) * pesos[i + 13 - tamanho];
        if (digito(soma) !== Number(cnpj[tamanho])) return false;
    }
    return true;
}

export function validarCadastro(dados, tipo) {
    const documento = tipo === "cidadao" ? "cpf" : "cnpj";
    const erros = {};
    for (const campo of ["nome", documento, "cep", "endereco", "municipio", "estado", "email", "senha"]) {
        if (!String(dados[campo] ?? "").trim()) erros[campo] = "Preencha este campo.";
    }
    if (!(documento === "cpf" ? cpfValido(dados.cpf) : cnpjValido(dados.cnpj))) erros[documento] = `Informe um ${documento.toUpperCase()} válido.`;
    if (!/^\d{8}$/.test(String(dados.cep ?? "").replace(/[.\-\s]/g, ""))) erros.cep = "Informe um CEP válido.";
    if (!ufValida(dados.estado)) erros.estado = "Informe uma UF válida.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(dados.email ?? "").trim())) erros.email = "Informe um e-mail válido.";
    if (!/(?=^[\s\S]{8,}$)(?=[\s\S]*\p{L})(?=[\s\S]*[0-9])/u.test(dados.senha ?? "")) erros.senha = "A senha deve ter pelo menos 8 caracteres, com uma letra e um número.";
    if (new TextEncoder().encode(dados.senha ?? "").length > 72) erros.senha = "A senha deve ter no máximo 72 bytes em UTF-8.";
    return erros;
}
