package com.supets.community.campanha;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CampanhaIntegrationTest {
    @Value("${local.server.port}") int port;
    private final JdbcTemplate jdbc;
    private final HttpClient client = HttpClient.newHttpClient();

    CampanhaIntegrationTest(@Autowired JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final String sufixo = UUID.randomUUID() + "@example.com";
    private final LocalDate hoje = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
    private String ong;
    private String outraOng;
    private String cidadao;

    @BeforeEach
    void cadastrarUsuarios() throws Exception {
        ong = cadastrar("ong", "cnpj", numero(14), "ong-" + sufixo);
        outraOng = cadastrar("ong", "cnpj", numero(14), "outra-" + sufixo);
        cidadao = cadastrar("cidadao", "cpf", numero(11), "pessoa-" + sufixo);
    }

    @AfterEach
    void limpar() {
        jdbc.update("DELETE FROM cidadao WHERE email LIKE ?", "%" + sufixo);
        jdbc.update("DELETE FROM ong WHERE email LIKE ?", "%" + sufixo);
    }

    @Test
    void ongCriaECidadaoParticipaUmaVez() throws Exception {
        var criada = enviar("POST", "", corpo("Vacinação Antirrábica", hoje.plusDays(5), hoje.plusDays(10), 1), ong, "ONG");
        assertThat(criada.statusCode()).isEqualTo(201);
        assertThat(criada.body()).contains("\"ongId\":\"" + ong + "\"", "\"tipoCampanhaId\":1", "\"cep\":\"23832231\"");
        String id = id(criada);

        assertThat(enviar("GET", "", null, cidadao, "CIDADAO").body()).contains(id);

        var participacao = enviar("POST", "/" + id + "/participacoes", null, cidadao, "CIDADAO");
        assertThat(participacao.statusCode()).isEqualTo(201);
        assertThat(participacao.body()).contains("\"participando\":true", "\"totalParticipantes\":1");

        var deNovo = enviar("POST", "/" + id + "/participacoes", null, cidadao, "CIDADAO");
        assertThat(deNovo.statusCode()).isEqualTo(409);

        assertThat(enviar("GET", "/participadas", null, cidadao, "CIDADAO").body()).contains(id);
        assertThat(enviar("GET", "/minhas", null, ong, "ONG").body()).contains(id);
        assertThat(enviar("GET", "/minhas", null, outraOng, "ONG").body()).doesNotContain(id);

        var detalhe = enviar("GET", "/" + id, null, ong, "ONG");
        assertThat(detalhe.statusCode()).isEqualTo(200);
        assertThat(detalhe.body()).contains("\"participando\":false", "\"totalParticipantes\":1", "\"ongNome\":\"Teste\"");
    }

    @Test
    void soAOngQueCriouAtualiza() throws Exception {
        String id = id(enviar("POST", "", corpo("Feira de adoção", hoje.plusDays(1), hoje.plusDays(2), 3), ong, "ONG"));

        var alheia = enviar("PUT", "/" + id, corpo("Outro título", hoje.plusDays(1), hoje.plusDays(2), 3), outraOng, "ONG");
        assertThat(alheia.statusCode()).isEqualTo(403);

        var atualizada = enviar("PUT", "/" + id, corpo("Feira de adoção no parque", hoje.plusDays(1), hoje.plusDays(3), 3), ong, "ONG");
        assertThat(atualizada.statusCode()).isEqualTo(200);
        assertThat(atualizada.body()).contains("\"titulo\":\"Feira de adoção no parque\"", "\"dataFim\":\"" + hoje.plusDays(3) + "\"");
    }

    @Test
    void recusaPerfilErradoEDadosInvalidos() throws Exception {
        String valido = corpo("Castração", hoje, hoje, 2);

        assertThat(enviar("POST", "", valido, null, null).statusCode()).isEqualTo(401);
        assertThat(enviar("POST", "", valido, cidadao, "CIDADAO").statusCode()).isEqualTo(403);

        var vazio = enviar("POST", "", "{}", ong, "ONG");
        assertThat(vazio.statusCode()).isEqualTo(400);
        assertThat(vazio.body()).contains("titulo", "dataInicio", "tipoCampanhaId", "cep");

        var passado = enviar("POST", "", corpo("Castração", hoje.minusDays(1), hoje, 2), ong, "ONG");
        assertThat(passado.statusCode()).isEqualTo(400);
        assertThat(passado.body()).contains("dataInicio");

        var fimAntes = enviar("POST", "", corpo("Castração", hoje.plusDays(2), hoje.plusDays(1), 2), ong, "ONG");
        assertThat(fimAntes.statusCode()).isEqualTo(400);
        assertThat(fimAntes.body()).contains("dataFim");

        var tipoInexistente = enviar("POST", "", corpo("Castração", hoje, hoje, 999), ong, "ONG");
        assertThat(tipoInexistente.statusCode()).isEqualTo(400);
        assertThat(tipoInexistente.body()).contains("tipoCampanhaId");

        String id = id(enviar("POST", "", valido, ong, "ONG"));
        assertThat(enviar("POST", "/" + id + "/participacoes", null, ong, "ONG").statusCode()).isEqualTo(403);
        assertThat(enviar("GET", "/" + UUID.randomUUID(), null, cidadao, "CIDADAO").statusCode()).isEqualTo(404);
    }

    @Test
    void naoDeixaParticiparDeCampanhaEncerrada() throws Exception {
        String id = id(enviar("POST", "", corpo("Vacinação", hoje, hoje, 1), ong, "ONG"));
        jdbc.update("UPDATE campanha SET data_inicio = ?, data_fim = ? WHERE id = ?::uuid",
            hoje.minusDays(3), hoje.minusDays(1), id);

        assertThat(enviar("POST", "/" + id + "/participacoes", null, cidadao, "CIDADAO").statusCode()).isEqualTo(409);
    }

    @Test
    void listaOsTiposDeCampanha() throws Exception {
        var tipos = enviar("GET", "/tipos", null, ong, "ONG");
        assertThat(tipos.statusCode()).isEqualTo(200);
        assertThat(tipos.body()).contains("\"id\":1", "\"id\":5");
    }

    private static String corpo(String titulo, LocalDate inicio, LocalDate fim, int tipo) {
        return """
            {"titulo":"%s","descricao":"Campanha gratuita para cães e gatos.","dataInicio":"%s","dataFim":"%s",
             "tipoCampanhaId":%d,"cep":"23832-231","endereco":"Rua das Flores, 150","cidade":"Campinas","estado":"sp"}
            """.formatted(titulo, inicio, fim, tipo);
    }

    private HttpResponse<String> enviar(String metodo, String caminho, String body, String usuarioId, String perfil)
            throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/community/campanha/api/v1" + caminho))
            .header("Content-Type", "application/json")
            .method(metodo, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        if (usuarioId != null) request.header("X-Usuario-Id", usuarioId).header("X-Usuario-Perfil", perfil);
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String cadastrar(String tipo, String documento, String numero, String email) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/community/" + tipo + "/api/v1"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("""
                {"nome":"Teste","%s":"%s","cep":"01234-567","endereco":"Rua A",
                 "municipio":"São Paulo","estado":"SP","email":"%s","senha":"senha123"}
                """.formatted(documento, numero, email)))
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(201);
        return id(response);
    }

    private static String numero(int digitos) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < digitos; i++) sb.append(ThreadLocalRandom.current().nextInt(10));
        return sb.toString();
    }

    private static String id(HttpResponse<String> response) {
        Matcher m = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"").matcher(response.body());
        assertThat(m.find()).isTrue();
        return m.group(1);
    }
}