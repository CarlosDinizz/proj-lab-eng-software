package com.supets.ocorrencias.ocorrencia.controller;

import com.supets.ocorrencias.ocorrencia.dto.*;
import com.supets.ocorrencias.ocorrencia.model.StatusOcorrencia;
import com.supets.ocorrencias.ocorrencia.model.TipoOcorrencia;
import com.supets.ocorrencias.ocorrencia.service.OcorrenciaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ocorrencia/api/v1")
public class OcorrenciaController {
    private final OcorrenciaService service;

    public OcorrenciaController(OcorrenciaService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<OcorrenciaRespostaDto> criar(@Valid @RequestBody CriarOcorrenciaDto dados) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dados));
    }

    @GetMapping
    public List<OcorrenciaRespostaDto> listar(@RequestParam(required = false) StatusOcorrencia status) {
        return service.listar(status);
    }

    @GetMapping("/tipos")
    public List<TipoOcorrencia> tipos() { return service.listarTipos(); }

    @GetMapping("/{id}")
    public OcorrenciaRespostaDto buscar(@PathVariable UUID id) { return service.buscar(id); }

    @PatchMapping("/{id}/status")
    public OcorrenciaRespostaDto atualizarStatus(@PathVariable UUID id, @Valid @RequestBody AtualizarStatusDto dados) {
        return service.atualizarStatus(id, dados);
    }
}
