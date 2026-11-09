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

    private String dados(int tipo, String titulo) {
        return """
            {"titulo":"%s","descricao":"Precisa de ajuda", "tipoOcorrenciaId":%d,
             "endereco":"Rua A", "cidade":"São Paulo",
             "estado":"SP", "especie":"Cão", "nomeAnimal":"Rex", "lat":-23.5}
            """.formatted(titulo, tipo);
    }

    private String criar(String titulo) throws Exception {
        String json = mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content(dados(1, titulo)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("ABERTA"))
            .andExpect(jsonPath("$.tipoOcorrenciaId").value(1))
            .andExpect(jsonPath("$.tipoOcorrencia").value("Animal Abandonado"))
            .andExpect(jsonPath("$.cidadaoId").value(CIDADAO))
            .andExpect(jsonPath("$.nomeAnimal").value("Rex"))
            .andExpect(jsonPath("$.lat").value(-23.5))
            .andExpect(jsonPath("$.createdAt").exists()).andReturn().getResponse().getContentAsString();
        return json.replaceFirst(".*\"id\":\"([^\"]+)\".*", "$1");
    }

    @Test void validaDadosETipo() throws Exception {
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.titulo").exists())
            .andExpect(jsonPath("$.cidadaoId").doesNotExist());
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content(dados(999, "Teste")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.tipoOcorrenciaId").exists());
        mvc.perform(get(API + "/" + UUID.randomUUID()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").exists());
        mvc.perform(get(API + "/tipos")).andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(3))).andExpect(jsonPath("$[0].tipo").value("Animal Abandonado"));
    }

    @Test void exigeUsuarioParaCriarEAtualizar() throws Exception {
        mvc.perform(post(API).contentType(MediaType.APPLICATION_JSON).content(dados(1, "Sem login")))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").exists());
        mvc.perform(como("nao-e-uuid", "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content(dados(1, "Id inválido")))
            .andExpect(status().isUnauthorized());
        mvc.perform(como(CIDADAO, "ADMIN", post(API)).contentType(MediaType.APPLICATION_JSON).content(dados(1, "Perfil inválido")))
            .andExpect(status().isUnauthorized());
        mvc.perform(mudarStatus(UUID.randomUUID().toString(), "EM_ANDAMENTO")).andExpect(status().isUnauthorized());
        mvc.perform(get(API)).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test void autorDaOcorrenciaVemDoUsuarioENaoDoCorpo() throws Exception {
        String corpo = dados(1, "Forjada").replace("\"lat\"", "\"cidadaoId\":\"" + OUTRO_CIDADAO + "\", \"lat\"");
        mvc.perform(como(CIDADAO, "CIDADAO", post(API)).contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.cidadaoId").value(CIDADAO));
    }

    @Test void listaEFluxoDeStatus() throws Exception {
        String primeira = criar("Primeira");
        String segunda = criar("Segunda");
        mvc.perform(get(API)).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].id").value(segunda));
        mvc.perform(como(ONG, "ONG", mudarStatus(primeira, "RESOLVIDA")))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.message").exists());
        mvc.perform(como(CIDADAO, "CIDADAO", mudarStatus(primeira, "EM_ANDAMENTO")))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").exists());
        mvc.perform(como(ONG, "ONG", patch(API + "/" + primeira + "/status")).contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"EM_ANDAMENTO\",\"ongId\":\"" + OUTRA_ONG + "\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.ongId").value(ONG));
        mvc.perform(get(API).param("status", "ABERTA"))
            .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].id").value(segunda));
        mvc.perform(como(OUTRA_ONG, "ONG", mudarStatus(primeira, "RESOLVIDA"))).andExpect(status().isForbidden());
        mvc.perform(como(OUTRO_CIDADAO, "CIDADAO", mudarStatus(primeira, "RESOLVIDA"))).andExpect(status().isForbidden());
        mvc.perform(como(ONG, "ONG", mudarStatus(primeira, "RESOLVIDA")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESOLVIDA"))
            .andExpect(jsonPath("$.ongId").value(ONG));
        mvc.perform(get(API + "/" + primeira)).andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("RESOLVIDA"));
        mvc.perform(como(ONG, "ONG", mudarStatus(primeira, "ABERTA")))
            .andExpect(status().isConflict());
    }

    @Test void quemRegistrouTambemPodeResolver() throws Exception {
        String ocorrencia = criar("Resolvida pelo autor");
        mvc.perform(como(ONG, "ONG", mudarStatus(ocorrencia, "EM_ANDAMENTO"))).andExpect(status().isOk());
        mvc.perform(como(CIDADAO, "CIDADAO", mudarStatus(ocorrencia, "RESOLVIDA")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESOLVIDA"));
    }
}
