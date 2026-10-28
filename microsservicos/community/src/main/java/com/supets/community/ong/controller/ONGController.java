package com.supets.community.ong.controller;

import com.supets.community.ong.dto.OngDto;
import com.supets.community.ong.service.ONGService;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ong")
public class ONGController {
    private final ONGService service;

    public ONGController(ONGService service) { this.service = service; }

    @PostMapping("/api/v1")
    public ResponseEntity<Map<String, UUID>> createOng(@Valid @RequestBody OngDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", service.createOng(request)));
    }

    @GetMapping("/api/v1/{id}")
    public ResponseEntity<String> getOng(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getOng(id));
    }
}
