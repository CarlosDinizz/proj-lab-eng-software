export const ESTADOS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const normalizarUf = (valor) => String(valor ?? "").trim().toUpperCase();
export const ufValida = (valor) => ESTADOS.includes(normalizarUf(valor));
let carregamento;
let recarregar = false;

/** Snapshot IBGE empacotado: nenhum formulário consulta um serviço externo. */
export function carregarMunicipios() {
    carregamento ??= fetch(new URL("../../../../shared/data/municipios.json", import.meta.url), {
        cache: recarregar ? "reload" : "default",
    }).then((resposta) => {
        if (!resposta.ok) throw new Error("Base de municípios indisponível.");
        return resposta.json();
    }).then((dados) => {
        if (Object.keys(dados ?? {}).length !== 27 || ESTADOS.some((uf) => !Array.isArray(dados[uf]) || !dados[uf].length)) {
            throw new Error("Base de municípios indisponível.");
        }
        return dados;
    }).catch((erro) => { carregamento = undefined; recarregar = true; throw erro; });
    return carregamento;
}

export function cidadeCanonica(dados, uf, cidade) {
    const nome = String(cidade ?? "").trim().normalize("NFC").toLocaleLowerCase("pt-BR");
    return dados?.[normalizarUf(uf)]?.find((item) => item.normalize("NFC").toLocaleLowerCase("pt-BR") === nome) ?? null;
}

export function validarEndereco(dados, estado, cidade, campo = "cidade") {
    if (!ufValida(estado)) return { estado: "Informe uma UF válida." };
    return cidadeCanonica(dados, estado, cidade) ? {} : { [campo]: "Selecione um município válido para a UF." };
}
