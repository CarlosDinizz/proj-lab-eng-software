package com.supets.community.cidadao.controller;

import com.supets.community.cidadao.dto.CidadaoDto;
import com.supets.community.cidadao.service.CidadaoService;
import com.supets.community.shared.dto.PerfilRespostaDto;
import com.supets.community.shared.dto.UsuarioAutenticado;
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
    public ResponseEntity<PerfilRespostaDto> getCidadao(@PathVariable UUID id,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil) {
        UsuarioAutenticado.de(usuarioId, perfil);
        return ResponseEntity.ok(service.getCidadao(id));
    }
}
