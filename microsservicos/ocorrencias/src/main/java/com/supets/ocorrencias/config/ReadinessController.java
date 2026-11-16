package com.supets.ocorrencias.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.Map;

@RestController
public class ReadinessController {
    private final DataSource dataSource;

    public ReadinessController(DataSource dataSource) { this.dataSource = dataSource; }

    @GetMapping("/internal/ready")
    public ResponseEntity<Map<String, String>> ready() {
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            statement.setQueryTimeout(1);
            try (var result = statement.executeQuery("""
                select exists(select 1 from tipo_ocorrencia)
                   and exists(select 1 from especie)
                   and exists(select 1 from porte)
                   and exists(select 1 from sexo_animal)
                """)) {
                if (result.next() && result.getBoolean(1)) return ResponseEntity.ok(Map.of("status", "UP"));
            }
        } catch (SQLException ignored) {
            // Readiness intentionally discloses neither SQL nor connection details.
        }
        return ResponseEntity.status(503).body(Map.of("status", "DOWN"));
    }
}
