package br.mackenzie.lab.supets.controller;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

@RestController
public class ProntidaoController {
    private final RestClient community;
    private final RestClient ocorrencias;

    public ProntidaoController(@Value("${COMMUNITY_URL:http://localhost:8083}") String communityUrl,
            @Value("${OCORRENCIAS_URL:http://localhost:8082}") String ocorrenciasUrl) {
        community = cliente(communityUrl);
        ocorrencias = cliente(ocorrenciasUrl);
    }

    private static RestClient cliente(String url) {
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofMillis(500))
            .followRedirects(HttpClient.Redirect.NEVER).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofMillis(1500));
        return RestClient.builder().baseUrl(url).requestFactory(factory).build();
    }

    @GetMapping("/api/ready")
    public ResponseEntity<Map<String, Object>> ready() {
        // Two sequential requests, each bounded to 1.5 s including a 0.5 s connect bound; no retry.
        long inicio = System.nanoTime();
        Map<String, String> componentes = new LinkedHashMap<>();
        componentes.put("community", verificar(community, "/community/internal/ready") ? "UP" : "DOWN");
        componentes.put("ocorrencias", verificar(ocorrencias, "/internal/ready") ? "UP" : "DOWN");
        boolean up = !componentes.containsValue("DOWN") && System.nanoTime() - inicio < Duration.ofSeconds(5).toNanos();
        return ResponseEntity.status(up ? 200 : 503).body(Map.of("status", up ? "UP" : "DOWN", "components", componentes));
    }

    private static boolean verificar(RestClient cliente, String caminho) {
        try {
            return Boolean.TRUE.equals(cliente.get().uri(caminho).exchange((request, response) -> {
                if (response.getStatusCode().value() != 200) return false;
                Map<?, ?> body = response.bodyTo(Map.class);
                return body != null && "UP".equals(body.get("status"));
            }));
        } catch (Exception ignored) { return false; }
    }
}
