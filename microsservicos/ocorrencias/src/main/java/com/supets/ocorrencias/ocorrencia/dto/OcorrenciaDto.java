package com.supets.ocorrencias.ocorrencia.dto;

public record OcorrenciaDto(
    String descricao,
    String tipo,
    double lat,
    double lon
) {
}
