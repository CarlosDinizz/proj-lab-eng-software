package br.mackenzie.lab.supets.seguranca;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AutenticacaoGatewayTest {
    private static final AtomicInteger CHAMADAS = new AtomicInteger();
    private static final HttpServer SERVICO = servico();

    @Value("${local.server.port}") int port;
    @Value("${supets.jwt.segredo}") String segredo;
    private final HttpClient client = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();

    @DynamicPropertySource
    static void enderecos(DynamicPropertyRegistry properties) {
        properties.add("COMMUNITY_URL", () -> "http://localhost:" + SERVICO.getAddress().getPort());
        properties.add("OCORRENCIAS_URL", () -> "http://localhost:" + SERVICO.getAddress().getPort());
    }

    @AfterAll
    static void parar() {
        SERVICO.stop(0);
    }

    @Test
    void rotasPublicasDispensamToken() throws Exception {
        assertThat(enviar("GET", "/ocorrencia/api/v1").statusCode()).isEqualTo(202);
        assertThat(enviar("GET", "/community/ong/api/v1/8").statusCode()).isEqualTo(202);
        assertThat(enviar("POST", "/community/auth/api/v1/login").statusCode()).isEqualTo(202);
        assertThat(enviar("POST", "/community/cidadao/api/v1").statusCode()).isEqualTo(202);
        assertThat(enviar("POST", "/community/ong/api/v1").statusCode()).isEqualTo(202);
        assertThat(enviar("GET", "/api/status").statusCode()).isEqualTo(200);
    }

    @Test
    void rotaProtegidaSemTokenRecebe401SemChegarAoServico() throws Exception {
        int antes = CHAMADAS.get();

        var resposta = enviar("POST", "/ocorrencia/api/v1");
        assertThat(resposta.statusCode()).isEqualTo(401);
        assertThat(resposta.body()).contains("login");
        assertThat(enviar("PATCH", "/ocorrencia/api/v1/" + UUID.randomUUID() + "/status").statusCode()).isEqualTo(401);
        assertThat(enviar("GET", "/community/cidadao/api/v1/1").statusCode()).isEqualTo(401);
        assertThat(enviar("GET", "/rota/inexistente").statusCode()).isEqualTo(401);

        assertThat(CHAMADAS.get()).isEqualTo(antes);
    }

    @Test
    void tokenValidoRepassaIdEPerfilAoServico() throws Exception {
        String id = UUID.randomUUID().toString();

        var resposta = enviar("POST", "/ocorrencia/api/v1", "Authorization", bearer(id, "ONG"));

        assertThat(resposta.statusCode()).isEqualTo(202);
        assertThat(resposta.body()).isEqualTo("POST|/ocorrencia/api/v1|" + id + "|ONG");
        // Com token, uma rota que não existe volta a ser só "não encontrada".
        assertThat(enviar("GET", "/rota/inexistente", "Authorization", bearer(id, "ONG")).statusCode()).isEqualTo(404);
    }

    @Test
    void tokenInvalidoVencidoOuDeOutraChaveRecebe401() throws Exception {
        String id = UUID.randomUUID().toString();
        List<String> tokens = List.of(
            "lixo",
            TokensDeTeste.gerar(segredo, id, "CIDADAO", Instant.now().minusSeconds(3600)),
            TokensDeTeste.valido("outra-chave-secreta-com-mais-de-32-bytes", id, "CIDADAO"),
            TokensDeTeste.valido(segredo, id, "ADMIN"),
            TokensDeTeste.valido(segredo, "nao-e-uuid", "CIDADAO"));
        int antes = CHAMADAS.get();

        for (String token : tokens) {
            assertThat(enviar("POST", "/ocorrencia/api/v1", "Authorization", "Bearer " + token).statusCode()).isEqualTo(401);
            // Token ruim é recusado mesmo em rota pública.
            assertThat(enviar("GET", "/ocorrencia/api/v1", "Authorization", "Bearer " + token).statusCode()).isEqualTo(401);
        }

        assertThat(CHAMADAS.get()).isEqualTo(antes);
    }

    @Test
    void clienteNaoConsegueForjarOsCabecalhosDeUsuario() throws Exception {
        String forjado = UUID.randomUUID().toString();
        var publica = enviar("GET", "/ocorrencia/api/v1", "X-Usuario-Id", forjado, "X-Usuario-Perfil", "ONG");
        assertThat(publica.body()).isEqualTo("GET|/ocorrencia/api/v1|-|-");

        String id = UUID.randomUUID().toString();
        var autenticada = enviar("POST", "/ocorrencia/api/v1",
            "Authorization", bearer(id, "CIDADAO"), "X-Usuario-Id", forjado, "x-usuario-perfil", "ONG");
        assertThat(autenticada.body()).isEqualTo("POST|/ocorrencia/api/v1|" + id + "|CIDADAO");
    }

    @Test
    void caminhoQueTentaDisfarcarARotaRecebe400() throws Exception {
        int antes = CHAMADAS.get();

        assertThat(enviar("GET", "/community/ong/api/v1/../../cidadao/api/v1/1").statusCode()).isEqualTo(400);
        assertThat(enviar("GET", "/community/ong/api/v1/%2e%2e/%2e%2e/cidadao/api/v1/1").statusCode()).isEqualTo(400);
        assertThat(enviar("GET", "/community/ong/api/v1/8;x=1").statusCode()).isEqualTo(400);

        assertThat(CHAMADAS.get()).isEqualTo(antes);
    }

    private String bearer(String id, String perfil) {
        return "Bearer " + TokensDeTeste.valido(segredo, id, perfil);
    }

    private HttpResponse<String> enviar(String metodo, String caminho, String... cabecalhos) throws Exception {
        var corpo = metodo.equals("GET") ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString("{}");
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + caminho))
            .method(metodo, corpo)
            .header("Content-Type", "application/json");
        for (int i = 0; i < cabecalhos.length; i += 2) request.header(cabecalhos[i], cabecalhos[i + 1]);
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    /** Serviço de mentira: responde 202 com o que recebeu, incluindo os cabeçalhos de usuário. */
    private static HttpServer servico() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            server.createContext("/", exchange -> {
                CHAMADAS.incrementAndGet();
                exchange.getRequestBody().readAllBytes();
                String id = exchange.getRequestHeaders().getFirst("X-Usuario-Id");
                String perfil = exchange.getRequestHeaders().getFirst("X-Usuario-Perfil");
                String resultado = exchange.getRequestMethod() + "|" + exchange.getRequestURI().getPath()
                    + "|" + (id == null ? "-" : id) + "|" + (perfil == null ? "-" : perfil);
                byte[] bytes = resultado.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(202, bytes.length);
                try (var saida = exchange.getResponseBody()) {
                    saida.write(bytes);
                }
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
