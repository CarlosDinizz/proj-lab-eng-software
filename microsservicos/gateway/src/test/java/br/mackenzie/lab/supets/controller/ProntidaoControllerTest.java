package br.mackenzie.lab.supets.controller;

import static org.assertj.core.api.Assertions.assertThat;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class ProntidaoControllerTest {
    @Test
    void requerAmbosOsServicosEPropagaRecuperacaoSemDetalhes() throws Exception {
        var community = new AtomicInteger(200);
        var ocorrencias = new AtomicInteger(200);
        var servidor = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        servidor.createContext("/community/internal/ready", exchange -> {
            byte[] body = "{\"status\":\"UP\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(community.get(), body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        servidor.createContext("/internal/ready", exchange -> {
            byte[] body = "{\"status\":\"UP\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(ocorrencias.get(), body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        servidor.start();
        try {
            String url = "http://localhost:" + servidor.getAddress().getPort();
            var controller = new ProntidaoController(url, url);
            var up = controller.ready();
            assertThat(up.getStatusCode().value()).isEqualTo(200);
            assertThat(up.getBody()).containsEntry("status", "UP").containsEntry("components", Map.of("community", "UP", "ocorrencias", "UP"));
            community.set(503);
            assertThat(controller.ready().getStatusCode().value()).isEqualTo(503);
            community.set(200);
            ocorrencias.set(503);
            var down = controller.ready();
            assertThat(down.getStatusCode().value()).isEqualTo(503);
            assertThat(down.getBody()).containsEntry("components", Map.of("community", "UP", "ocorrencias", "DOWN"));
            ocorrencias.set(200);
            assertThat(controller.ready().getStatusCode().value()).isEqualTo(200);
        } finally { servidor.stop(0); }
    }

    @Test
    void timeoutAgregadoFicaAbaixoDeCincoSegundos() throws Exception {
        var servidor = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        var executor = Executors.newVirtualThreadPerTaskExecutor();
        servidor.setExecutor(executor);
        servidor.createContext("/", exchange -> {
            try { Thread.sleep(4000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            exchange.close();
        });
        servidor.start();
        try {
            String url = "http://localhost:" + servidor.getAddress().getPort();
            long inicio = System.nanoTime();
            var response = new ProntidaoController(url, url).ready();
            assertThat(response.getStatusCode().value()).isEqualTo(503);
            assertThat(Duration.ofNanos(System.nanoTime() - inicio)).isLessThan(Duration.ofSeconds(5));
            assertThat(response.getBody()).containsEntry("components", Map.of("community", "DOWN", "ocorrencias", "DOWN"));
        } finally {
            servidor.stop(0);
            executor.shutdownNow();
            executor.close();
        }
    }
}
