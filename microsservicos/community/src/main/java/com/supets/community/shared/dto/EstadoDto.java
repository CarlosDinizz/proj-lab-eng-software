package com.supets.community.shared.dto;

import jakarta.validation.constraints.NotBlank;

public record EstadoDto(
    @NotBlank String nome,
    @NotBlank String uf
) {
}
