package com.supets.community.shared.dto;

import jakarta.validation.constraints.NotBlank;

public record ContatoDto(
    @NotBlank String valor,
    @NotBlank String tipo
) {
}
