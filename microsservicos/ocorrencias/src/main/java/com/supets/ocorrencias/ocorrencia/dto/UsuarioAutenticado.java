package com.supets.ocorrencias.ocorrencia.dto;

import com.supets.ocorrencias.ocorrencia.enums.PerfilEnum;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Quem está fazendo a requisição, conforme os cabeçalhos que o gateway preenche a partir do token. */
public record UsuarioAutenticado(UUID id, PerfilEnum perfil) {
    public static final String CABECALHO_ID = "X-Usuario-Id";
    public static final String CABECALHO_PERFIL = "X-Usuario-Perfil";

    public static UsuarioAutenticado de(String id, String perfil) {
        if (id == null || perfil == null) throw naoAutenticado();
        try {
            return new UsuarioAutenticado(UUID.fromString(id), PerfilEnum.valueOf(perfil));
        } catch (IllegalArgumentException e) {
            throw naoAutenticado();
        }
    }

    public boolean ehOng() {
        return perfil == PerfilEnum.ONG;
    }

    private static ResponseStatusException naoAutenticado() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Faça login para continuar.");
    }
}
