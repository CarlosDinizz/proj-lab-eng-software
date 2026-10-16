package com.supets.community.shared.dto;

import jakarta.validation.constraints.NotBlank;

public record CidadeDto(
    @NotBlank
    String nome
) {
}
