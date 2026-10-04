package com.supets.community.cidadao.controller;

import com.supets.community.cidadao.service.CidadaoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cidadao")
public class CidadaoController {

    private final CidadaoService service;

    @Autowired
    public CidadaoController(CidadaoService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/{id}")
    private ResponseEntity<String> getCidadao(@PathVariable Integer id) {
        String cidadao = service.getCidadao(id);
        return ResponseEntity.ok(cidadao);
    }

    @PostMapping("/api/v1")
    private ResponseEntity<Void> createCidadao() {
        service.createCidadao();
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

}
