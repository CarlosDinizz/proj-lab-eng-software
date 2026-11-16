package com.supets.community.campanha;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
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
class CampanhaIntegrationTest extends com.supets.community.IsolatedPostgresTest {
    @Value("${local.server.port}") int port;
    private final JdbcTemplate jdbc;
    private final HttpClient client = HttpClient.newHttpClient();
    @Autowired private com.supets.community.campanha.service.CampanhaService service;
    @Autowired private org.springframework.transaction.PlatformTransactionManager transactionManager;

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
        assertThat(enviar("GET", "/" + id, null, ong, "ONG").body()).contains("\"titulo\":\"Feira de adoção\"").doesNotContain("Outro título");

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
        var cidadeInvalida = enviar("POST", "", valido.replace("Campinas", "Curitiba"), ong, "ONG");
        assertThat(cidadeInvalida.statusCode()).isEqualTo(400);
        assertThat(cidadeInvalida.body()).contains("\"cidade\":\"Selecione um município válido para a UF.\"");

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

    @Test
    void atualizacaoQueEncerraPrimeiroImpedeParticipacaoBloqueada() throws Exception {
        String id = id(enviar("POST", "", corpo("Ordem de atualização", hoje, hoje, 1), ong, "ONG"));
        jdbc.update("UPDATE campanha SET data_inicio = ? WHERE id = ?::uuid", hoje.minusDays(2), id);
        var tx = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        try (var executor = java.util.concurrent.Executors.newSingleThreadExecutor()) {
            java.util.concurrent.Future<?>[] espera = new java.util.concurrent.Future<?>[1];
            var concorrentePid = new java.util.concurrent.atomic.AtomicInteger();
            tx.executeWithoutResult(status -> {
                service.atualizar(UUID.fromString(id), usuario(ong, "ONG"), dados(hoje.minusDays(2), hoje.minusDays(1)));
                espera[0] = executarConcorrente(executor, concorrentePid,
                    () -> service.participar(UUID.fromString(id), usuario(cidadao, "CIDADAO")));
                aguardarBloqueio(concorrentePid, espera[0]);
            });
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> espera[0].get(5, java.util.concurrent.TimeUnit.SECONDS))
                .isInstanceOf(java.util.concurrent.ExecutionException.class)
                .hasCauseInstanceOf(com.supets.community.shared.exceptions.ApiException.class)
                .hasRootCauseMessage("Esta campanha já terminou.");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM participacao_campanha WHERE campanha_id = ?::uuid", Integer.class, id)).isZero();
        }
    }

    @Test
    void participacaoQueVencePreservaVinculoAposAlteracaoDasDatas() throws Exception {
        String id = id(enviar("POST", "", corpo("Ordem de participação", hoje, hoje, 1), ong, "ONG"));
        jdbc.update("UPDATE campanha SET data_inicio = ? WHERE id = ?::uuid", hoje.minusDays(2), id);
        var tx = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        try (var executor = java.util.concurrent.Executors.newSingleThreadExecutor()) {
            java.util.concurrent.Future<?>[] espera = new java.util.concurrent.Future<?>[1];
            var concorrentePid = new java.util.concurrent.atomic.AtomicInteger();
            tx.executeWithoutResult(status -> {
                service.participar(UUID.fromString(id), usuario(cidadao, "CIDADAO"));
                espera[0] = executarConcorrente(executor, concorrentePid,
                    () -> service.atualizar(UUID.fromString(id), usuario(ong, "ONG"), dados(hoje.minusDays(2), hoje.minusDays(1))));
                aguardarBloqueio(concorrentePid, espera[0]);
            });
            espera[0].get(5, java.util.concurrent.TimeUnit.SECONDS);
            var detalhe = enviar("GET", "/" + id, null, cidadao, "CIDADAO");
            assertThat(detalhe.body()).contains("\"participando\":true", "\"totalParticipantes\":1");
        }
    }

    @Test
    void duasParticipacoesConcorrentesGravamUmUnicoVinculo() throws Exception {
        String id = id(enviar("POST", "", corpo("Participações concorrentes", hoje, hoje, 1), ong, "ONG"));
        var inicio = new java.util.concurrent.CountDownLatch(1);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { inicio.await(); return enviar("POST", "/" + id + "/participacoes", null, cidadao, "CIDADAO"); });
            var b = executor.submit(() -> { inicio.await(); return enviar("POST", "/" + id + "/participacoes", null, cidadao, "CIDADAO"); });
            inicio.countDown();
            assertThat(java.util.List.of(a.get(5, java.util.concurrent.TimeUnit.SECONDS).statusCode(), b.get(5, java.util.concurrent.TimeUnit.SECONDS).statusCode()))
                .containsExactlyInAnyOrder(201, 409);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM participacao_campanha WHERE campanha_id = ?::uuid", Integer.class, id)).isEqualTo(1);
        }
    }

    private java.util.concurrent.Future<?> executarConcorrente(java.util.concurrent.ExecutorService executor,
            java.util.concurrent.atomic.AtomicInteger pid, Runnable operacao) {
        return executor.submit(() -> new org.springframework.transaction.support.TransactionTemplate(transactionManager)
            .executeWithoutResult(status -> {
                pid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                operacao.run();
            }));
    }

    private void aguardarBloqueio(java.util.concurrent.atomic.AtomicInteger concorrentePid,
            java.util.concurrent.Future<?> resultado) {
        long limite = System.nanoTime() + java.time.Duration.ofSeconds(5).toNanos();
        while (System.nanoTime() < limite) {
            // pg_stat_activity caches its backend snapshot inside this still-open transaction.
            // Poll the exact worker PID's live blockers instead, including newly opened connections.
            int pid = concorrentePid.get();
            if (pid != 0 && Boolean.TRUE.equals(jdbc.queryForObject(
                    "SELECT pg_backend_pid() = ANY(pg_blocking_pids(?))", Boolean.class, pid))) return;
            if (resultado.isDone()) {
                try { resultado.get(); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new AssertionError(e); }
                catch (java.util.concurrent.ExecutionException e) { throw new AssertionError("The competing transaction failed before waiting for the campaign row lock.", e.getCause()); }
                throw new AssertionError("The competing transaction completed without waiting for the campaign row lock.");
            }
            try { Thread.sleep(10); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new AssertionError(e); }
        }
        throw new AssertionError("The competing PostgreSQL transaction did not wait for the campaign row lock.");
    }

    private static com.supets.community.shared.dto.UsuarioAutenticado usuario(String id, String perfil) {
        return new com.supets.community.shared.dto.UsuarioAutenticado(UUID.fromString(id), com.supets.community.shared.enums.PerfilEnum.valueOf(perfil));
    }

    private static com.supets.community.campanha.dto.CampanhaDto dados(LocalDate inicio, LocalDate fim) {
        return new com.supets.community.campanha.dto.CampanhaDto("Datas alteradas", "Descrição válida", inicio, fim, 1, "01234567", "Rua A", "Campinas", "SP");
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
        return com.supets.community.DocumentosDeTeste.numero(digitos);
    }

    private static String id(HttpResponse<String> response) {
        Matcher m = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"").matcher(response.body());
        assertThat(m.find()).isTrue();
        return m.group(1);
    }
}