package com.supets.community.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class LoginIntegrationTest {
    @Value("${local.server.port}") int port;
    private final JdbcTemplate jdbc;
    private final HttpClient client = HttpClient.newHttpClient();

    LoginIntegrationTest(@Autowired JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final String sufixo = UUID.randomUUID() + "@example.com";
    private final String emailPessoa = "pessoa-" + sufixo;
    private final String emailOng = "ong-" + sufixo;
    private final String cpf = String.format("%011d", ThreadLocalRandom.current().nextLong(100_000_000_000L));
    private final String cnpj = String.format("%014d", ThreadLocalRandom.current().nextLong(100_000_000_000_000L));

    @AfterEach
    void limpar() {
        jdbc.update("DELETE FROM cidadao WHERE email LIKE ?", "%" + sufixo);
        jdbc.update("DELETE FROM ong WHERE email LIKE ?", "%" + sufixo);
    }

    @Test
    void fazLoginDeCidadaoEOng() throws Exception {
        String idCidadao = id(cadastrar("cidadao", "cpf", cpf, emailPessoa));
        String idOng = id(cadastrar("ong", "cnpj", cnpj, emailOng));

        var cidadao = login(emailPessoa, "senha123");
        assertThat(cidadao.statusCode()).isEqualTo(200);
        assertThat(cidadao.body()).contains("\"id\":\"" + idCidadao + "\"", "\"perfil\":\"CIDADAO\"", "\"nome\":\"Teste\"");
        String payload = payload(cidadao.body());
        assertThat(payload).contains("\"sub\":\"" + idCidadao + "\"", "\"perfil\":\"CIDADAO\"", "\"iss\":\"supets-community\"", "\"exp\"");
        assertThat(payload).doesNotContain("senha");

        var ong = login(emailOng, "senha123");
        assertThat(ong.statusCode()).isEqualTo(200);
        assertThat(ong.body()).contains("\"id\":\"" + idOng + "\"", "\"perfil\":\"ONG\"");
        assertThat(payload(ong.body())).contains("\"sub\":\"" + idOng + "\"", "\"perfil\":\"ONG\"");
    }

    @Test
    void rejeitaSenhaErradaEEmailInexistenteDoMesmoJeito() throws Exception {
        cadastrar("cidadao", "cpf", cpf, emailPessoa);

        var senhaErrada = login(emailPessoa, "errada999");
        var emailInexistente = login("ninguem-" + sufixo, "senha123");

        assertThat(senhaErrada.statusCode()).isEqualTo(401);
        assertThat(emailInexistente.statusCode()).isEqualTo(401);
        assertThat(senhaErrada.body()).isEqualTo(emailInexistente.body()).contains("E-mail ou senha inválidos");
        assertThat(senhaErrada.body()).doesNotContain("token");
    }

    @Test
    void aceitaEmailComMaiusculasEEspacos() throws Exception {
        cadastrar("cidadao", "cpf", cpf, emailPessoa);

        assertThat(login("  " + emailPessoa.toUpperCase() + " ", "senha123").statusCode()).isEqualTo(200);
    }

    @Test
    void rejeitaCamposVazios() throws Exception {
        var response = post("auth/api/v1/login", "{\"email\":\"\",\"senha\":\"\"}");

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(response.body()).contains("email", "senha");
    }

    private HttpResponse<String> cadastrar(String tipo, String documento, String numero, String email) throws Exception {
        var response = post(tipo + "/api/v1", """
            {"nome":"Teste","%s":"%s","cep":"01234-567","endereco":"Rua A",
             "municipio":"São Paulo","estado":"SP","email":"%s","senha":"senha123"}
            """.formatted(documento, numero, email));
        assertThat(response.statusCode()).isEqualTo(201);
        return response;
    }

    private HttpResponse<String> login(String email, String senha) throws Exception {
        return post("auth/api/v1/login", "{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(email, senha));
    }

    private HttpResponse<String> post(String caminho, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/community/" + caminho))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private static String id(HttpResponse<String> response) {
        Matcher m = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"").matcher(response.body());
        assertThat(m.find()).isTrue();
        return m.group(1);
    }

    /** Decodifica o payload (parte do meio) do token devolvido no login. */
    private static String payload(String body) {
        Matcher m = Pattern.compile("\"token\":\"([^\"]+)\"").matcher(body);
        assertThat(m.find()).isTrue();
        String[] partes = m.group(1).split("\\.");
        assertThat(partes).hasSize(3);
        return new String(Base64.getUrlDecoder().decode(partes[1]), StandardCharsets.UTF_8);
    }
}
