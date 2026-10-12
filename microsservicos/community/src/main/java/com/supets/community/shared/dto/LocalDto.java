package com.supets.community.shared.dto;

public record LocalDto(
    String endereco,
    Integer numero,
    String complememto,
    CidadeDto cidade,
    EstadoDto estado
) {
}
