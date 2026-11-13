package com.supets.ocorrencias.ocorrencia;

import com.supets.ocorrencias.ocorrencia.repository.OcorrenciaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.time.LocalDate;
import java.util.UUID;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class OcorrenciaApiTest {
    private static final String API = "/ocorrencia/api/v1";
    private static final String CIDADAO = "c4598d1a-e75c-4eee-961d-373dbcbdb3b0";
    private static final String OUTRO_CIDADAO = "0b6f3c52-7d0e-4c1b-9a53-2f4e8d1c6a77";
    private static final String ONG = "eab2ae81-abdc-4ac0-a00b-922a78f1bc37";
    private static final String OUTRA_ONG = "5d2c9e14-3b7a-4f60-8e21-6c0a9b7d4f33";
    // Pontos reais: centro de São Paulo, Moema (~6 km dele) e Santos (~55 km dele)
    private static final double[] CENTRO_SP = {-23.5505, -46.6333};
    private static final double[] MOEMA = {-23.6010, -46.6650};
    private static final double[] SANTOS = {-23.9608, -46.3336};
    @Autowired MockMvc mvc;
    @Autowired OcorrenciaRepository repository;

    @BeforeEach void limpar() { repository.deleteAll(); }

    /** Simula o que o gateway faz depois de validar o token. */
    private static MockHttpServletRequestBuilder como(String id, String perfil, MockHttpServletRequestBuilder request) {
        return request.header("X-Usuario-Id", id).header("X-Usuario-Perfil", perfil);
    }

    private static MockHttpServletRequestBuilder mudarStatus(String ocorrencia, String novoStatus) {
        return patch(API + "/" + ocorrencia + "/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"" + novoStatus + "\"}");
    }

    private static String dados(int tipo, String titulo, double[] ponto, String animal) {
        return """
            {"titulo":"%s","descricao":"Precisa de ajuda","dataOcorrido":"%s","tipoOcorrenciaId":%d,
             "cep":"04094-050","endereco":"Av. Ibirapuera, 3103","cidade":"São Paulo","estado":"sp",
             "lat":%s,"lon":%s,"animal":%s}
            """.formatted(titulo, LocalDate.now().minusDays(1), tipo, ponto[0], ponto[1], animal);
    }

    private static String dados(int tipo, String titulo) {
        return dados(tipo, titulo, CENTRO_SP,
            "{\"nome\":\"Thor\",\"especieId\":1,\"sexoId\":1,\"raca\":\"Golden retriever\",\"porteId\":3}");
    }

    private String criar(String titulo, double[] ponto) throws Exception {
        String json = mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON)
                .content(dados(1, titulo, ponto, "{\"especieId\":2}")))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.replaceFirst(".*?\"id\":\"([^\"]+)\".*", "$1");
    }

    private String criar(String titulo) throws Exception {
        return criar(titulo, CENTRO_SP);
    }

    @Test void criaComOsCamposDoWireframe() throws Exception {
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content(dados(1, "Thor sumiu")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("ABERTA"))
            .andExpect(jsonPath("$.tipoOcorrencia").value("Animal Abandonado"))
            .andExpect(jsonPath("$.cidadaoId").value(CIDADAO))
            .andExpect(jsonPath("$.dataOcorrido").value(LocalDate.now().minusDays(1).toString()))
            .andExpect(jsonPath("$.cep").value("04094050"))
            .andExpect(jsonPath("$.estado").value("SP"))
            .andExpect(jsonPath("$.lat").value(CENTRO_SP[0]))
            .andExpect(jsonPath("$.animal.nome").value("Thor"))
            .andExpect(jsonPath("$.animal.especie").value("Cachorro"))
            .andExpect(jsonPath("$.animal.sexo").value("Macho"))
            .andExpect(jsonPath("$.animal.porte").value("Grande"))
            .andExpect(jsonPath("$.animal.raca").value("Golden retriever"))
            .andExpect(jsonPath("$.responsavelId").value(nullValue()))
            .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test void soEspecieEObrigatoriaNoAnimal() throws Exception {
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON)
                .content(dados(1, "Gato sem nome", CENTRO_SP, "{\"especieId\":2,\"nome\":\"  \"}")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.animal.especie").value("Gato"))
            .andExpect(jsonPath("$.animal.nome").value(nullValue()))
            .andExpect(jsonPath("$.animal.sexo").value(nullValue()));
    }

    @Test void validaDadosEOpcoes() throws Exception {
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.titulo").exists()).andExpect(jsonPath("$.dataOcorrido").exists())
            .andExpect(jsonPath("$.cep").exists()).andExpect(jsonPath("$.lat").exists())
            .andExpect(jsonPath("$.animal").exists());
        String futuro = dados(1, "Futuro").replace(LocalDate.now().minusDays(1).toString(), LocalDate.now().plusDays(2).toString());
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content(futuro))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.dataOcorrido").exists());
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON)
                .content(dados(1, "CEP ruim").replace("04094-050", "123")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.cep").exists());
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON)
                .content(dados(1, "Sem espécie", CENTRO_SP, "{\"nome\":\"Rex\"}")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$['animal.especieId']").exists());
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON)
                .content(dados(1, "Espécie inexistente", CENTRO_SP, "{\"especieId\":99}")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$['animal.especieId']").value("Espécie não encontrada."));
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON)
                .content(dados(1, "Porte inexistente", CENTRO_SP, "{\"especieId\":1,\"porteId\":99}")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$['animal.porteId']").exists());
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content(dados(999, "Tipo inexistente")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.tipoOcorrenciaId").exists());
        mvc.perform(get(API + "/" + UUID.randomUUID()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").exists());
    }

    @Test void listasDeOpcoesDoFormulario() throws Exception {
        mvc.perform(get(API + "/tipos")).andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(3))).andExpect(jsonPath("$[0].tipo").value("Animal Abandonado"));
        mvc.perform(get(API + "/especies")).andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(4))).andExpect(jsonPath("$[0].nome").value("Cachorro"));
        mvc.perform(get(API + "/portes")).andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(3))).andExpect(jsonPath("$[2].nome").value("Grande"));
        mvc.perform(get(API + "/sexos")).andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(3))).andExpect(jsonPath("$[1].nome").value("Fêmea"));
    }

    @Test void exigeUsuarioParaCriarAtualizarEVerMinhas() throws Exception {
        mvc.perform(post(API).contentType(MediaType.APPLICATION_JSON).content(dados(1, "Sem login")))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").exists());
        mvc.perform(como("nao-e-uuid", "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content(dados(1, "Id inválido")))
            .andExpect(status().isUnauthorized());
        mvc.perform(como(CIDADAO, "ADMIN", post(API)).contentType(MediaType.APPLICATION_JSON).content(dados(1, "Perfil inválido")))
            .andExpect(status().isUnauthorized());
        mvc.perform(mudarStatus(UUID.randomUUID().toString(), "EM_ANDAMENTO")).andExpect(status().isUnauthorized());
        mvc.perform(get(API + "/minhas")).andExpect(status().isUnauthorized());
    }

    @Test void autorDaOcorrenciaVemDoUsuarioENaoDoCorpo() throws Exception {
        String corpo = dados(1, "Forjada").replace("\"lat\"", "\"cidadaoId\":\"" + OUTRO_CIDADAO + "\", \"lat\"");
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.cidadaoId").value(CIDADAO));
    }

    @Test void listaPorProximidade() throws Exception {
        String centro = criar("Centro", CENTRO_SP);
        String moema = criar("Moema", MOEMA);
        criar("Santos", SANTOS);

        mvc.perform(get(API)).andExpect(jsonPath("$", hasSize(3)));
        // A partir de Moema, raio padrão de 10 km: Moema primeiro (mais perto), depois o centro; Santos fica de fora.
        mvc.perform(get(API).param("lat", String.valueOf(MOEMA[0])).param("lon", String.valueOf(MOEMA[1])))
            .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].id").value(moema)).andExpect(jsonPath("$[1].id").value(centro));
        mvc.perform(get(API).param("lat", String.valueOf(MOEMA[0])).param("lon", String.valueOf(MOEMA[1])).param("raioKm", "100"))
            .andExpect(jsonPath("$", hasSize(3)));
        mvc.perform(get(API).param("lat", "-23.5")).andExpect(status().isBadRequest());
        mvc.perform(get(API).param("lat", "-23.5").param("lon", "-46.6").param("raioKm", "0")).andExpect(status().isBadRequest());
    }

    @Test void qualquerUsuarioPodeAssumirEQuemAssumiuResolve() throws Exception {
        String primeira = criar("Primeira");
        String segunda = criar("Segunda");
        mvc.perform(get(API)).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].id").value(segunda));

        // RF2: um cidadão que não é o autor assume e coopera
        mvc.perform(como(OUTRO_CIDADAO, "CIDADAO", patch(API + "/" + primeira + "/status")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"EM_ANDAMENTO\",\"responsavelId\":\"" + OUTRA_ONG + "\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("EM_ANDAMENTO"))
            .andExpect(jsonPath("$.responsavelId").value(OUTRO_CIDADAO))
            .andExpect(jsonPath("$.responsavelPerfil").value("CIDADAO"));
        mvc.perform(get(API).param("status", "ABERTA"))
            .andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].id").value(segunda));
        // Já está em andamento: ninguém mais assume
        mvc.perform(como(ONG, "ONG", mudarStatus(primeira, "EM_ANDAMENTO"))).andExpect(status().isConflict());
        // Quem não assumiu nem registrou não resolve
        mvc.perform(como(ONG, "ONG", mudarStatus(primeira, "RESOLVIDA")))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").exists());
        // UC002: quem atendeu o animal conclui
        mvc.perform(como(OUTRO_CIDADAO, "CIDADAO", mudarStatus(primeira, "RESOLVIDA")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESOLVIDA"));
        mvc.perform(get(API + "/" + primeira)).andExpect(jsonPath("$.status").value("RESOLVIDA"));
        mvc.perform(como(OUTRO_CIDADAO, "CIDADAO", mudarStatus(primeira, "ABERTA"))).andExpect(status().isConflict());

        // ONG também pode assumir
        mvc.perform(como(ONG, "ONG", mudarStatus(segunda, "EM_ANDAMENTO")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.responsavelPerfil").value("ONG"));
    }

    @Test void quemRegistrouPodeResolver() throws Exception {
        String assumida = criar("Assumida por ONG");
        mvc.perform(como(ONG, "ONG", mudarStatus(assumida, "EM_ANDAMENTO"))).andExpect(status().isOk());
        mvc.perform(como(CIDADAO, "CIDADAO", mudarStatus(assumida, "RESOLVIDA")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESOLVIDA"));

        // Ocorrência ainda aberta: só o autor pode resolver direto
        String aberta = criar("Dono achou o animal");
        mvc.perform(como(OUTRO_CIDADAO, "CIDADAO", mudarStatus(aberta, "RESOLVIDA")))
            .andExpect(status().isForbidden());
        mvc.perform(como(CIDADAO, "CIDADAO", mudarStatus(aberta, "RESOLVIDA")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESOLVIDA"));
    }

    @Test void minhasTrazAsQueRegistreiOuAssumi() throws Exception {
        String registrada = criar("Registrada pelo cidadão");
        String outra = mvc.perform(como(OUTRO_CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON)
                .content(dados(1, "De outra pessoa")))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()
            .replaceFirst(".*?\"id\":\"([^\"]+)\".*", "$1");

        mvc.perform(como(CIDADAO, "CIDADAO", get(API + "/minhas")))
            .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].id").value(registrada));

        mvc.perform(como(CIDADAO, "CIDADAO", mudarStatus(outra, "EM_ANDAMENTO"))).andExpect(status().isOk());
        mvc.perform(como(CIDADAO, "CIDADAO", get(API + "/minhas")))
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[*].id", containsInAnyOrder(registrada, outra)));
        mvc.perform(como(ONG, "ONG", get(API + "/minhas"))).andExpect(jsonPath("$", hasSize(0)));
    }
}
