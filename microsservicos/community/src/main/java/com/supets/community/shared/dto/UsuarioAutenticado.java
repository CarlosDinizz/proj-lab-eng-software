package com.supets.community.shared.dto;

import com.supets.community.shared.exceptions.ApiException;
import com.supets.community.shared.enums.PerfilEnum;
import java.util.UUID;
import org.springframework.http.HttpStatus;

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

    public boolean ehOng() { return perfil == PerfilEnum.ONG; }

    public boolean ehCidadao() { return perfil == PerfilEnum.CIDADAO; }

    private static ApiException naoAutenticado() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "Faça login para continuar.");
    }
}