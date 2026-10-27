package br.mackenzie.lab.supets.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GatewayIntegrationTest {
    private static final HttpServer COMMUNITY = upstream("community");
    private static final HttpServer OCORRENCIAS = upstream("ocorrencias");

    @Autowired
    private TestRestTemplate client;

    @DynamicPropertySource
    static void upstreamAddresses(DynamicPropertyRegistry properties) {
        properties.add("COMMUNITY_URL", () -> address(COMMUNITY));
        properties.add("OCORRENCIAS_URL", () -> address(OCORRENCIAS));
    }

    @AfterAll
    static void stopUpstreams() {
        COMMUNITY.stop(0);
        OCORRENCIAS.stop(0);
    }

    @Test
    void forwardsCitizenAndOngRequestsToCommunity() {
        assertForwarded("/cidadao/api/v1/7?filter=active", "community|GET|/cidadao/api/v1/7?filter=active|");
        assertForwarded("/ong/api/v1/8", "community|GET|/ong/api/v1/8|");
        assertForwarded("/cidadao/api/v1", "community|GET|/cidadao/api/v1|");
    }

    @Test
    void forwardsOccurrenceRequestsToOccurrences() {
        assertForwarded("/ocorrencia/api/v1/3", "ocorrencias|GET|/ocorrencia/api/v1/3|");
        assertForwarded("/ocorrencia/api/v1", "ocorrencias|GET|/ocorrencia/api/v1|");
    }

    @Test
    void forwardsMethodBodyAndUpstreamResponse() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");
        ResponseEntity<String> response = client.exchange("/ong/api/v1", HttpMethod.POST,
                new HttpEntity<>("{\"nome\":\"ONG\"}", headers), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        assertThat(response.getHeaders().getFirst("X-Upstream")).isEqualTo("community");
        assertThat(response.getBody()).isEqualTo("community|POST|/ong/api/v1|{\"nome\":\"ONG\"}");
    }

    @Test
    void keepsStatusLocalAndRejectsOtherPaths() {
        assertThat(client.getForEntity("/api/status", String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(client.getForEntity("/ongextra/api/v1/1", String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(client.getForEntity("/unknown", String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    private void assertForwarded(String path, String expected) {
        ResponseEntity<String> response = client.getForEntity(path, String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        assertThat(response.getBody()).isEqualTo(expected);
    }

    private static String address(HttpServer server) {
        return "http://localhost:" + server.getAddress().getPort();
    }

    private static HttpServer upstream(String name) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            server.createContext("/", exchange -> {
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                String result = name + "|" + exchange.getRequestMethod() + "|" + exchange.getRequestURI() + "|" + body;
                byte[] bytes = result.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("X-Upstream", name);
                exchange.sendResponseHeaders(202, bytes.length);
                try (var output = exchange.getResponseBody()) {
                    output.write(bytes);
                }
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
