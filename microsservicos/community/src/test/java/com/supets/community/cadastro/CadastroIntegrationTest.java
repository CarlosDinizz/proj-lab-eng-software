package com.supets.community.cadastro;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterEach;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CadastroIntegrationTest {
    @Value("${local.server.port}") int port;
    private final JdbcTemplate jdbc;
    private final HttpClient client = HttpClient.newHttpClient();

    CadastroIntegrationTest(@org.springframework.beans.factory.annotation.Autowired JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final String sufixo = UUID.randomUUID() + "@example.com";
    private final String emailPessoa = "pessoa-" + sufixo;
    private final String emailOng = "ong-" + sufixo;
    private final String emailOutro = "outro-" + sufixo;
    private final String cpf = String.format("%011d", ThreadLocalRandom.current().nextLong(100_000_000_000L));
    private final String outroCpf = String.format("%011d", ThreadLocalRandom.current().nextLong(100_000_000_000L));
    private final String cnpj = String.format("%014d", ThreadLocalRandom.current().nextLong(100_000_000_000_000L));

    @AfterEach
    void limpar() {
        jdbc.update("DELETE FROM cidadao WHERE email LIKE ?", "%" + sufixo);
        jdbc.update("DELETE FROM ong WHERE email LIKE ?", "%" + sufixo);
    }

    @Test
    void cadastraCidadaoEOngComSenhasProtegidas() throws Exception {
        var cidadao = post("cidadao", corpo("cpf", cpf.substring(0, 3) + "." + cpf.substring(3), emailPessoa));
        var ong = post("ong", corpo("cnpj", cnpj.substring(0, 2) + "." + cnpj.substring(2), emailOng));
        assertThat(cidadao.statusCode()).isEqualTo(201);
        assertThat(ong.statusCode()).isEqualTo(201);
        assertThat(cidadao.body()).matches("\\{\"id\":\"[0-9a-f-]{36}\"}");
        assertThat(ong.body()).matches("\\{\"id\":\"[0-9a-f-]{36}\"}");
        assertThat(jdbc.queryForObject("SELECT cpf FROM cidadao WHERE email = ?", String.class, emailPessoa)).isEqualTo(cpf);
        assertThat(jdbc.queryForObject("SELECT cnpj FROM ong WHERE email = ?", String.class, emailOng)).isEqualTo(cnpj);
        for (String tabela : new String[] {"cidadao", "ong"}) {
            String hash = jdbc.queryForObject("SELECT senha_hash FROM " + tabela + " WHERE email = ?", String.class, tabela.equals("cidadao") ? emailPessoa : emailOng);
            assertThat(hash).isNotEqualTo("senha123");
            assertThat(new BCryptPasswordEncoder().matches("senha123", hash)).isTrue();
        }
    }

    @Test
    void rejeitaDocumentosEEmailsDuplicadosInclusiveEntreTipos() throws Exception {
        assertThat(post("cidadao", corpo("cpf", cpf, emailPessoa)).statusCode()).isEqualTo(201);
        assertThat(post("cidadao", corpo("cpf", cpf, emailOutro)).body()).contains("cpf");
        assertThat(post("cidadao", corpo("cpf", cpf, emailOutro)).statusCode()).isEqualTo(409);
        var email = post("ong", corpo("cnpj", cnpj, emailPessoa.toUpperCase()));
        assertThat(email.statusCode()).isEqualTo(409);
        assertThat(email.body()).contains("email");
        assertThat(post("ong", corpo("cnpj", cnpj, emailOng)).statusCode()).isEqualTo(201);
        assertThat(post("ong", corpo("cnpj", cnpj, emailOutro)).statusCode()).isEqualTo(409);
        assertThat(post("cidadao", corpo("cpf", outroCpf, emailOng)).statusCode()).isEqualTo(409);
    }

    @Test
    void rejeitaDadosInvalidos() throws Exception {
        var response = post("cidadao", corpo("cpf", "123", "invalido").replace("senha123", "curta"));
        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(response.body()).contains("cpf", "email", "senha");
        assertThat(post("ong", "{}").statusCode()).isEqualTo(400);
        var senhaLonga = post("ong", corpo("cnpj", cnpj, emailOng).replace("senha123", "á".repeat(40) + "1"));
        assertThat(senhaLonga.statusCode()).isEqualTo(400);
        assertThat(senhaLonga.body()).contains("senha");
    }

    private HttpResponse<String> post(String tipo, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/" + tipo + "/api/v1"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private String corpo(String documento, String numero, String email) {
        return """
            {"nome":"Teste","%s":"%s","cep":"01234-567","endereco":"Rua A",
             "municipio":"São Paulo","estado":"SP","email":"%s","senha":"senha123"}
            """.formatted(documento, numero, email);
    }
}
