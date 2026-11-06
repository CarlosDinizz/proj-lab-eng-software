package com.supets.community.shared.dto;

import com.supets.community.shared.enums.PerfilEnum;
import java.util.UUID;

public record CredencialDto(
    UUID id,
    String nome,
    String senhaHash,
    PerfilEnum perfil
) {
    @Override
    public String toString() {
        return "CredencialDto[id=" + id + ", nome=" + nome + ", senhaHash=***, perfil=" + perfil + "]";
    }
}
