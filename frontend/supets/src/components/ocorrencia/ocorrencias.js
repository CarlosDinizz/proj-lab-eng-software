/**
 * Regras das telas de ocorrência (UC001, UC002, UC003), separadas do visual para poderem ser testadas.
 */

export const ESTADOS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

/** Centro do mapa quando ainda não sabemos onde a pessoa está (Praça da Sé, São Paulo). */
export const CENTRO_PADRAO = { lat: -23.5505, lon: -46.6333 };

export const STATUS = {
    ABERTA: { texto: "Aberta", cor: "orange" },
    EM_ANDAMENTO: { texto: "Em andamento", cor: "blue" },
    RESOLVIDA: { texto: "Resolvida", cor: "green" },
};

export const VALORES_INICIAIS = {
    titulo: "", descricao: "", dataOcorrido: "", tipoOcorrenciaId: "",
    cep: "", endereco: "", cidade: "", estado: "",
    lat: null, lon: null,
    nomeAnimal: "", especieId: "", sexoId: "", raca: "", porteId: "",
};

const OBRIGATORIOS = {
    titulo: "Informe o título.",
    descricao: "Descreva a ocorrência.",
    dataOcorrido: "Informe a data do ocorrido.",
    tipoOcorrenciaId: "Selecione o tipo da ocorrência.",
    cep: "Informe o CEP.",
    endereco: "Informe o endereço.",
    cidade: "Informe a cidade.",
    estado: "Selecione o estado.",
    especieId: "Selecione a espécie.",
};

/** Data de hoje no formato do <input type="date"> (aaaa-mm-dd), no fuso de quem está usando. */
export function hoje(agora = new Date()) {
    const doisDigitos = (n) => String(n).padStart(2, "0");
    return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

/** Deixa o CEP no formato 00000-000 enquanto a pessoa digita. */
export function formatarCep(texto) {
    const digitos = String(texto).replace(/\D/g, "").slice(0, 8);
    return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

/** Confere o formulário antes de enviar. Devolve {campo: mensagem}; vazio quando está tudo certo. */
export function validar(valores, dataDeHoje = hoje()) {
    const erros = {};
    for (const [campo, mensagem] of Object.entries(OBRIGATORIOS)) {
        if (!String(valores[campo] ?? "").trim()) erros[campo] = mensagem;
    }
    if (valores.titulo?.trim().length > 255) erros.titulo = "Use no máximo 255 caracteres.";
    // As datas aaaa-mm-dd podem ser comparadas como texto
    if (valores.dataOcorrido && valores.dataOcorrido > dataDeHoje) erros.dataOcorrido = "A data não pode estar no futuro.";
    if (valores.cep && valores.cep.replace(/\D/g, "").length !== 8) erros.cep = "O CEP deve ter 8 dígitos.";
    if (valores.lat == null || valores.lon == null) erros.lat = "Clique no mapa para marcar onde o animal está.";
    return erros;
}

const opcional = (texto) => String(texto ?? "").trim() || undefined;
const idOpcional = (id) => (id === "" || id == null ? undefined : Number(id));

/** Monta o JSON que o back espera, com o animal num objeto separado (como no diagrama de classes). */
export function montarCorpo(valores) {
    return {
        titulo: valores.titulo.trim(),
        descricao: valores.descricao.trim(),
        dataOcorrido: valores.dataOcorrido,
        tipoOcorrenciaId: Number(valores.tipoOcorrenciaId),
        cep: valores.cep.replace(/\D/g, ""),
        endereco: valores.endereco.trim(),
        cidade: valores.cidade.trim(),
        estado: valores.estado,
        lat: valores.lat,
        lon: valores.lon,
        animal: {
            nome: opcional(valores.nomeAnimal),
            especieId: Number(valores.especieId),
            sexoId: idOpcional(valores.sexoId),
            raca: opcional(valores.raca),
            porteId: idOpcional(valores.porteId),
        },
    };
}

/** Traduz os nomes de campo do back ("animal.especieId", "lon") para os campos da tela. */
export function errosDoBack(corpo) {
    const erros = {};
    for (const [campo, mensagem] of Object.entries(corpo ?? {})) {
        if (typeof mensagem !== "string") continue;
        let nome = campo.startsWith("animal.") ? campo.slice("animal.".length) : campo;
        if (nome === "nome") nome = "nomeAnimal";
        if (nome === "lon") nome = "lat";
        erros[nome] = erros[nome] ?? mensagem;
    }
    return erros;
}

/**
 * O que o usuário pode fazer com a ocorrência (mesmas regras do back):
 * - assumir: qualquer pessoa logada, enquanto está ABERTA (RF2);
 * - resolver: quem assumiu ou quem registrou, se EM_ANDAMENTO; só quem registrou, se ainda ABERTA (UC002).
 */
export function acoesPermitidas(ocorrencia, usuario) {
    if (!ocorrencia || !usuario) return { assumir: false, resolver: false };
    const ehAutor = ocorrencia.cidadaoId === usuario.id;
    const ehResponsavel = ocorrencia.responsavelId === usuario.id;
    return {
        assumir: ocorrencia.status === "ABERTA",
        resolver: (ocorrencia.status === "EM_ANDAMENTO" && (ehAutor || ehResponsavel))
            || (ocorrencia.status === "ABERTA" && ehAutor),
    };
}

/** Distância em km entre dois pontos {lat, lon} (fórmula de Haversine, a mesma do back). */
export function distanciaKm(a, b) {
    const rad = (graus) => (graus * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function formatarDistancia(km) {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace(".", ",")} km`;
}

/** "2026-09-13" -> "13/09/2026" */
export function formatarData(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

/** Monta o endereço da listagem conforme o filtro escolhido. */
export function caminhoDaLista({ minhas, status, local, raioKm }) {
    if (minhas) return "/ocorrencia/api/v1/minhas";
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (local && raioKm) {
        params.set("lat", String(local.lat));
        params.set("lon", String(local.lon));
        params.set("raioKm", String(raioKm));
    }
    const busca = params.toString();
    return busca ? `/ocorrencia/api/v1?${busca}` : "/ocorrencia/api/v1";
}
