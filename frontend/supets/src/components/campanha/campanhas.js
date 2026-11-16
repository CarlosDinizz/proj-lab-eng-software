import { formatarCep, hoje } from "../ocorrencia/ocorrencias.js";

export const API_CAMPANHAS = "/community/campanha/api/v1";

export const VALORES_INICIAIS = {
    titulo: "", descricao: "", dataInicio: "", dataFim: "", tipoCampanhaId: "",
    cep: "", endereco: "", cidade: "", estado: "",
};

const OBRIGATORIOS = {
    titulo: "Informe o título.",
    descricao: "Descreva a campanha.",
    dataInicio: "Informe a data de início.",
    dataFim: "Informe a data de fim.",
    tipoCampanhaId: "Selecione o tipo da campanha.",
    cep: "Informe o CEP.",
    endereco: "Informe o endereço.",
    cidade: "Informe a cidade.",
    estado: "Selecione o estado.",
};

export function validar(valores, dataDeHoje = hoje(), inicioOriginal = null) {
    const erros = {};
    for (const [campo, mensagem] of Object.entries(OBRIGATORIOS)) {
        if (!String(valores[campo] ?? "").trim()) erros[campo] = mensagem;
    }
    if (valores.titulo?.trim().length > 255) erros.titulo = "Use no máximo 255 caracteres.";
    if (valores.dataInicio && valores.dataInicio < dataDeHoje && valores.dataInicio !== inicioOriginal) {
        erros.dataInicio = "A campanha não pode começar no passado.";
    }
    if (valores.dataInicio && valores.dataFim && valores.dataFim < valores.dataInicio) {
        erros.dataFim = "A data de fim deve ser igual ou depois da data de início.";
    }
    if (valores.cep && valores.cep.replace(/\D/g, "").length !== 8) erros.cep = "O CEP deve ter 8 dígitos.";
    return erros;
}

export function montarCorpo(valores) {
    return {
        titulo: valores.titulo.trim(),
        descricao: valores.descricao.trim(),
        dataInicio: valores.dataInicio,
        dataFim: valores.dataFim,
        tipoCampanhaId: Number(valores.tipoCampanhaId),
        cep: valores.cep.replace(/\D/g, ""),
        endereco: valores.endereco.trim(),
        cidade: valores.cidade.trim(),
        estado: valores.estado,
    };
}

export function valoresDe(campanha) {
    return {
        titulo: campanha.titulo ?? "",
        descricao: campanha.descricao ?? "",
        dataInicio: campanha.dataInicio ?? "",
        dataFim: campanha.dataFim ?? "",
        tipoCampanhaId: campanha.tipoCampanhaId == null ? "" : String(campanha.tipoCampanhaId),
        cep: formatarCep(campanha.cep ?? ""),
        endereco: campanha.endereco ?? "",
        cidade: campanha.cidade ?? "",
        estado: campanha.estado ?? "",
    };
}

export function errosDoBack(corpo) {
    const erros = {};
    for (const [campo, mensagem] of Object.entries(corpo ?? {})) {
        if (typeof mensagem === "string") erros[campo] = mensagem;
    }
    return erros;
}

export const LISTAS = {
    todas: { titulo: "Buscar campanhas", caminho: API_CAMPANHAS, vazia: "Nenhuma campanha encontrada." },
    minhas: { titulo: "Minhas campanhas", caminho: `${API_CAMPANHAS}/minhas`, vazia: "Você ainda não criou campanhas." },
    participadas: {
        titulo: "Campanhas participadas", caminho: `${API_CAMPANHAS}/participadas`,
        vazia: "Você ainda não participa de nenhuma campanha.",
    },
};

const normalizar = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function filtrarCampanhas(campanhas, { busca = "", estado = "", cidade = "" } = {}) {
    const termo = normalizar(busca);
    const nomeCidade = normalizar(cidade);
    return campanhas.filter((c) =>
        (!termo || normalizar(c.titulo).includes(termo))
        && (!estado || c.estado === estado)
        && (!nomeCidade || normalizar(c.cidade).includes(nomeCidade)));
}

export function situacao(campanha, dataDeHoje = hoje()) {
    if (campanha.dataFim < dataDeHoje) return { texto: "Encerrada", cor: "gray" };
    if (campanha.dataInicio > dataDeHoje) return { texto: "Em breve", cor: "blue" };
    return { texto: "Acontecendo", cor: "green" };
}

export function podeParticipar(campanha, usuario, dataDeHoje = hoje()) {
    if (!campanha || usuario?.perfil !== "CIDADAO") return false;
    return !campanha.participando && campanha.dataFim >= dataDeHoje;
}

export function podeEditar(campanha, usuario) {
    return Boolean(campanha && usuario?.perfil === "ONG" && campanha.ongId === usuario.id);
}