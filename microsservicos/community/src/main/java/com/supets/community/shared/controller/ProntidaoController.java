package com.supets.community.shared.controller;

import java.sql.Connection;
import java.sql.Statement;
import java.sql.ResultSet;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProntidaoController {
    private final DataSource dataSource;
    public ProntidaoController(DataSource dataSource) { this.dataSource = dataSource; }

    @GetMapping("/internal/ready")
    public ResponseEntity<Map<String, String>> ready() {
        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            statement.setQueryTimeout(1);
            try (ResultSet rs = statement.executeQuery("SELECT EXISTS(SELECT 1 FROM tipo_contato) AND EXISTS(SELECT 1 FROM tipo_campanha)")) {
                if (rs.next() && rs.getBoolean(1)) return ResponseEntity.ok(Map.of("status", "UP"));
            }
        } catch (Exception ignored) { /* Readiness must not expose database configuration or SQL. */ }
        return ResponseEntity.status(503).body(Map.of("status", "DOWN"));
    }
}
