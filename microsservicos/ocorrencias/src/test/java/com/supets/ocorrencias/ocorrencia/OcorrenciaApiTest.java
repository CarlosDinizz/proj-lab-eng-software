package com.supets.ocorrencias.ocorrencia;

import com.supets.ocorrencias.ocorrencia.repository.OcorrenciaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.UUID;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class OcorrenciaApiTest {
    private static final String API = "/ocorrencia/api/v1";
    private static final String CIDADAO = "c4598d1a-e75c-4eee-961d-373dbcbdb3b0";
    private static final String ONG = "eab2ae81-abdc-4ac0-a00b-922a78f1bc37";
    @Autowired MockMvc mvc;
    @Autowired OcorrenciaRepository repository;

    @BeforeEach void limpar() { repository.deleteAll(); }

    private String dados(int tipo, String titulo) {
        return """
            {"titulo":"%s","descricao":"Precisa de ajuda", "tipoOcorrenciaId":%d,
             "cidadaoId":"%s", "endereco":"Rua A", "cidade":"São Paulo",
             "estado":"SP", "especie":"Cão", "nomeAnimal":"Rex", "lat":-23.5}
            """.formatted(titulo, tipo, CIDADAO);
    }

    private String criar(String titulo) throws Exception {
        String json = mvc.perform(post(API).contentType(MediaType.APPLICATION_JSON).content(dados(1, titulo)))
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
        mvc.perform(post(API).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.titulo").exists())
            .andExpect(jsonPath("$.cidadaoId").exists());
        mvc.perform(post(API).contentType(MediaType.APPLICATION_JSON).content(dados(999, "Teste")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.tipoOcorrenciaId").exists());
        mvc.perform(get(API + "/" + UUID.randomUUID()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").exists());
        mvc.perform(get(API + "/tipos")).andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(3))).andExpect(jsonPath("$[0].tipo").value("Animal Abandonado"));
    }

    @Test void listaEFluxoDeStatus() throws Exception {
        String primeira = criar("Primeira");
        String segunda = criar("Segunda");
        mvc.perform(get(API)).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].id").value(segunda));
        mvc.perform(patch(API + "/" + primeira + "/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"RESOLVIDA\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.message").exists());
        mvc.perform(patch(API + "/" + primeira + "/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"EM_ANDAMENTO\"}"))
            .andExpect(status().isConflict());
        mvc.perform(patch(API + "/" + primeira + "/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"EM_ANDAMENTO\",\"ongId\":\"" + ONG + "\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.ongId").value(ONG));
        mvc.perform(get(API).param("status", "ABERTA"))
            .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].id").value(segunda));
        mvc.perform(patch(API + "/" + primeira + "/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"RESOLVIDA\",\"ongId\":\"" + UUID.randomUUID() + "\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESOLVIDA"))
            .andExpect(jsonPath("$.ongId").value(ONG));
        mvc.perform(get(API + "/" + primeira)).andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("RESOLVIDA"));
        mvc.perform(patch(API + "/" + primeira + "/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"ABERTA\"}"))
            .andExpect(status().isConflict());
    }
}
