package com.supets.community.cadastro;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterEach;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CadastroIntegrationTest extends com.supets.community.IsolatedPostgresTest {
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
    private final String cpf = com.supets.community.DocumentosDeTeste.cpf();
    private final String outroCpf = com.supets.community.DocumentosDeTeste.cpf();
    private final String cnpj = com.supets.community.DocumentosDeTeste.cnpj();

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

    @Test
    void cadastrosConcorrentesReservamUmEmailCanonico() throws Exception {
        var inicio = new java.util.concurrent.CountDownLatch(1);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var pessoa = executor.submit(() -> { inicio.await(); return post("cidadao", corpo("cpf", cpf, emailPessoa)); });
            var ong = executor.submit(() -> { inicio.await(); return post("ong", corpo("cnpj", cnpj, "  " + emailPessoa.toUpperCase() + "  ")); });
            inicio.countDown();
            var a = pessoa.get(10, java.util.concurrent.TimeUnit.SECONDS);
            var b = ong.get(10, java.util.concurrent.TimeUnit.SECONDS);
            assertThat(java.util.List.of(a.statusCode(), b.statusCode())).containsExactlyInAnyOrder(201, 409);
            assertThat(jdbc.queryForObject("SELECT (SELECT count(*) FROM cidadao WHERE lower(btrim(email)) = ?) + (SELECT count(*) FROM ong WHERE lower(btrim(email)) = ?)",
                Integer.class, emailPessoa, emailPessoa)).isEqualTo(1);
            var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/community/auth/api/v1/login"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(
                    "{\"email\":\"%s\",\"senha\":\"senha123\"}".formatted(emailPessoa))).build();
            assertThat(client.send(request, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(200);
        }
    }

    @Test
    void mesmoPerfilTambemSerializaEmailComMaiusculasEEspacos() throws Exception {
        var inicio = new java.util.concurrent.CountDownLatch(1);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { inicio.await(); return post("cidadao", corpo("cpf", cpf, emailPessoa)); });
            var b = executor.submit(() -> { inicio.await(); return post("cidadao", corpo("cpf", outroCpf, "  " + emailPessoa.toUpperCase() + "  ")); });
            inicio.countDown();
            assertThat(java.util.List.of(a.get(10, java.util.concurrent.TimeUnit.SECONDS).statusCode(), b.get(10, java.util.concurrent.TimeUnit.SECONDS).statusCode()))
                .containsExactlyInAnyOrder(201, 409);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM cidadao WHERE lower(btrim(email)) = ?", Integer.class, emailPessoa)).isEqualTo(1);
        }
    }

    @Test
    void rollbackLiberaReservaEValidaEnderecoSemInternet() throws Exception {
        var invalida = post("cidadao", corpo("cpf", cpf, emailPessoa).replace("São Paulo", "Curitiba"));
        assertThat(invalida.statusCode()).isEqualTo(400);
        assertThat(invalida.body()).contains("\"municipio\":\"Selecione um município válido para a UF.\"");
        assertThat(post("ong", corpo("cnpj", cnpj, emailPessoa)).statusCode()).isEqualTo(201);
        var uf = post("cidadao", corpo("cpf", cpf, emailOutro).replace("\"SP\"", "\"ZZ\""));
        assertThat(uf.statusCode()).isEqualTo(400);
        assertThat(uf.body()).contains("\"estado\":\"Informe uma UF válida.\"");
    }

    @Test
    void normalizaDocumentoAlfanumericoEEnderecoCanonico() throws Exception {
        var criada = post("ong", corpo("cnpj", "12.abc.345/01de-35", emailOng)
            .replace("São Paulo", "  sÃO pAULO  "));
        assertThat(criada.statusCode()).isEqualTo(201);
        assertThat(jdbc.queryForObject("SELECT cnpj FROM ong WHERE email = ?", String.class, emailOng)).isEqualTo("12ABC34501DE35");
        assertThat(jdbc.queryForObject("SELECT municipio FROM ong WHERE email = ?", String.class, emailOng)).isEqualTo("São Paulo");
        assertThat(post("ong", corpo("cnpj", "12ABC34501DE35", emailOutro)).statusCode()).isEqualTo(409);
    }

    @Test
    void perfilUsaUuidNaoExpoeDadosPrivadosEValidaIdentidade() throws Exception {
        var pessoa = post("cidadao", corpo("cpf", cpf, emailPessoa));
        var ong = post("ong", corpo("cnpj", cnpj, emailOng));
        assertThat(pessoa.statusCode()).isEqualTo(201);
        assertThat(ong.statusCode()).isEqualTo(201);
        String pessoaId = pessoa.body().substring(7, 43);
        String ongId = ong.body().substring(7, 43);
        var publica = get("ong", ongId, null);
        assertThat(publica.statusCode()).isEqualTo(200);
        assertThat(publica.body()).isEqualTo("{\"id\":\"" + ongId + "\",\"nome\":\"Teste\",\"perfil\":\"ONG\"}");
        assertThat(get("cidadao", pessoaId, null).statusCode()).isEqualTo(401);
        var privada = get("cidadao", pessoaId, pessoaId);
        assertThat(privada.statusCode()).isEqualTo(200);
        assertThat(privada.body()).isEqualTo("{\"id\":\"" + pessoaId + "\",\"nome\":\"Teste\",\"perfil\":\"CIDADAO\"}");
        var ongAusente = get("ong", UUID.randomUUID().toString(), null);
        assertThat(ongAusente.statusCode()).isEqualTo(404);
        assertThat(ongAusente.body()).isEqualTo("{\"message\":\"ONG não encontrada.\"}");
        var cidadaoAusente = get("cidadao", UUID.randomUUID().toString(), pessoaId);
        assertThat(cidadaoAusente.statusCode()).isEqualTo(404);
        assertThat(cidadaoAusente.body()).isEqualTo("{\"message\":\"Cidadão não encontrado.\"}");
        assertThat(get("ong", "7", null).statusCode()).isEqualTo(400);
        assertThat(get("cidadao", "7", pessoaId).statusCode()).isEqualTo(400);
    }

    private HttpResponse<String> get(String tipo, String id, String usuarioId) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/community/" + tipo + "/api/v1/" + id));
        if (usuarioId != null) request.header("X-Usuario-Id", usuarioId).header("X-Usuario-Perfil", "CIDADAO");
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String tipo, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/community/" + tipo + "/api/v1"))
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
