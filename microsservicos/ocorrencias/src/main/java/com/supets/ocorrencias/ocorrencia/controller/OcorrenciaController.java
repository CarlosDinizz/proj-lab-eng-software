package com.supets.ocorrencias.ocorrencia.controller;

import com.supets.ocorrencias.ocorrencia.service.OcorrenciaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ocorrencia")
public class OcorrenciaController {

    private final OcorrenciaService service;

    @Autowired
    public OcorrenciaController(OcorrenciaService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/{id}")
    private ResponseEntity<String> getOcorrencia(@PathVariable Integer id) {
        String ocorrencia = service.getOcorrencia(id);
        return ResponseEntity.ok(ocorrencia);
    }

    @PostMapping("/api/v1")
    private ResponseEntity<Void> createOcorrencia() {
        service.createOcorrencia();
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

}
