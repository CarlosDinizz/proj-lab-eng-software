package com.supets.community.cidadao.controller;

import com.supets.community.cidadao.dto.CidadaoDto;
import com.supets.community.cidadao.service.CidadaoService;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cidadao")
public class CidadaoController {
    private final CidadaoService service;

    public CidadaoController(CidadaoService service) { this.service = service; }

    @PostMapping("/api/v1")
    public ResponseEntity<Map<String, UUID>> createCidadao(@Valid @RequestBody CidadaoDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", service.createCidadao(request)));
    }

    @GetMapping("/api/v1/{id}")
    public ResponseEntity<String> getCidadao(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getCidadao(id));
    }
}
