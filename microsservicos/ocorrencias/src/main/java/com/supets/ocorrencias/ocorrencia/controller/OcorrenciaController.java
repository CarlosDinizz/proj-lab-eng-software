package com.supets.ocorrencias.ocorrencia.controller;

import com.supets.ocorrencias.ocorrencia.dto.*;
import com.supets.ocorrencias.ocorrencia.model.*;
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
    public ResponseEntity<OcorrenciaRespostaDto> criar(
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil,
            @Valid @RequestBody CriarOcorrenciaDto dados) {
        UsuarioAutenticado autor = UsuarioAutenticado.de(usuarioId, perfil);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(autor, dados));
    }

    /** UC003: com lat e lon, só as ocorrências próximas (raioKm, padrão 10 km). */
    @GetMapping
    public List<OcorrenciaRespostaDto> listar(
            @RequestParam(required = false) StatusOcorrencia status,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon,
            @RequestParam(required = false) Double raioKm) {
        return service.listar(status, lat, lon, raioKm);
    }

    /** "Minhas Ocorrências" do wireframe: as que o usuário registrou ou assumiu. */
    @GetMapping("/minhas")
    public List<OcorrenciaRespostaDto> minhas(
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil) {
        return service.listarMinhas(UsuarioAutenticado.de(usuarioId, perfil));
    }

    @GetMapping("/tipos")
    public List<TipoOcorrencia> tipos() { return service.listarTipos(); }

    @GetMapping("/especies")
    public List<Especie> especies() { return service.listarEspecies(); }

    @GetMapping("/portes")
    public List<Porte> portes() { return service.listarPortes(); }

    @GetMapping("/sexos")
    public List<SexoAnimal> sexos() { return service.listarSexos(); }

    @GetMapping("/{id}")
    public OcorrenciaRespostaDto buscar(@PathVariable UUID id) { return service.buscar(id); }

    @PatchMapping("/{id}/status")
    public OcorrenciaRespostaDto atualizarStatus(
            @PathVariable UUID id,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil,
            @Valid @RequestBody AtualizarStatusDto dados) {
        return service.atualizarStatus(id, UsuarioAutenticado.de(usuarioId, perfil), dados);
    }
}
