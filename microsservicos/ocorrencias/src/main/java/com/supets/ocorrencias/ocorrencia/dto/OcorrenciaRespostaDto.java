package com.supets.ocorrencias.ocorrencia.dto;

import com.supets.ocorrencias.ocorrencia.enums.PerfilEnum;
import com.supets.ocorrencias.ocorrencia.model.Ocorrencia;
import com.supets.ocorrencias.ocorrencia.model.StatusOcorrencia;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record OcorrenciaRespostaDto(
    UUID id, String titulo, String descricao, LocalDate dataOcorrido,
    Integer tipoOcorrenciaId, String tipoOcorrencia,
    UUID cidadaoId, StatusOcorrencia status, UUID responsavelId, PerfilEnum responsavelPerfil, Instant createdAt,
    String cep, String endereco, String cidade, String estado, Double lat, Double lon,
    AnimalRespostaDto animal
) {
    public static OcorrenciaRespostaDto de(Ocorrencia o) {
        return new OcorrenciaRespostaDto(o.getId(), o.getTitulo(), o.getDescricao(), o.getDataOcorrido(),
            o.getTipoOcorrencia().getId(), o.getTipoOcorrencia().getTipo(),
            o.getCidadaoId(), o.getStatus(), o.getResponsavelId(), o.getResponsavelPerfil(), o.getCreatedAt(),
            o.getCep(), o.getEndereco(), o.getCidade(), o.getEstado(), o.getLat(), o.getLon(),
            AnimalRespostaDto.de(o.getAnimal()));
    }
}
