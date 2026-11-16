package com.supets.community.campanha.controller;

import com.supets.community.campanha.dto.CampanhaDto;
import com.supets.community.campanha.dto.CampanhaRespostaDto;
import com.supets.community.campanha.dto.UsuarioAutenticado;
import com.supets.community.campanha.model.TipoCampanha;
import com.supets.community.campanha.service.CampanhaService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/campanha/api/v1")
public class CampanhaController {
    private final CampanhaService service;

    public CampanhaController(CampanhaService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<CampanhaRespostaDto> criar(
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil,
            @Valid @RequestBody CampanhaDto dados) {
        UsuarioAutenticado usuario = UsuarioAutenticado.de(usuarioId, perfil);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(usuario, dados));
    }

    @GetMapping
    public List<CampanhaRespostaDto> listar(
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil) {
        return service.listar(UsuarioAutenticado.de(usuarioId, perfil));
    }

    @GetMapping("/minhas")
    public List<CampanhaRespostaDto> minhas(
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil) {
        return service.listarMinhas(UsuarioAutenticado.de(usuarioId, perfil));
    }

    @GetMapping("/participadas")
    public List<CampanhaRespostaDto> participadas(
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil) {
        return service.listarParticipadas(UsuarioAutenticado.de(usuarioId, perfil));
    }

    @GetMapping("/tipos")
    public List<TipoCampanha> tipos(
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil) {
        UsuarioAutenticado.de(usuarioId, perfil);
        return service.listarTipos();
    }

    @GetMapping("/{id}")
    public CampanhaRespostaDto buscar(
            @PathVariable UUID id,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil) {
        return service.buscar(id, UsuarioAutenticado.de(usuarioId, perfil));
    }

    @PutMapping("/{id}")
    public CampanhaRespostaDto atualizar(
            @PathVariable UUID id,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil,
            @Valid @RequestBody CampanhaDto dados) {
        return service.atualizar(id, UsuarioAutenticado.de(usuarioId, perfil), dados);
    }

    @PostMapping("/{id}/participacoes")
    public ResponseEntity<CampanhaRespostaDto> participar(
            @PathVariable UUID id,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_ID, required = false) String usuarioId,
            @RequestHeader(value = UsuarioAutenticado.CABECALHO_PERFIL, required = false) String perfil) {
        UsuarioAutenticado usuario = UsuarioAutenticado.de(usuarioId, perfil);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.participar(id, usuario));
    }
}
