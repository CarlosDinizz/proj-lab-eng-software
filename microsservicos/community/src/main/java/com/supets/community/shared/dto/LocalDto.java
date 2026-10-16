package com.supets.community.shared.dto;

import jakarta.validation.constraints.NotBlank;

public record LocalDto(
    @NotBlank String endereco,
    Integer numero,
    String complemento,
    CidadeDto cidade,
    EstadoDto estado
) {
}
