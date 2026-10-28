package com.supets.ocorrencias.ocorrencia.dto;

import com.supets.ocorrencias.ocorrencia.model.Ocorrencia;
import com.supets.ocorrencias.ocorrencia.model.StatusOcorrencia;
import java.time.Instant;
import java.util.UUID;

public record OcorrenciaRespostaDto(
    UUID id, String titulo, String descricao, Integer tipoOcorrenciaId, String tipoOcorrencia,
    UUID cidadaoId, StatusOcorrencia status, UUID ongId, Instant createdAt,
    String endereco, String cidade, String estado, String especie, String nomeAnimal,
    String sexo, String raca, String porte, Double lat, Double lon
) {
    public static OcorrenciaRespostaDto de(Ocorrencia o) {
        return new OcorrenciaRespostaDto(o.getId(), o.getTitulo(), o.getDescricao(),
            o.getTipoOcorrencia().getId(), o.getTipoOcorrencia().getTipo(), o.getCidadaoId(),
            o.getStatus(), o.getOngId(), o.getCreatedAt(), o.getEndereco(), o.getCidade(),
            o.getEstado(), o.getEspecie(), o.getNomeAnimal(), o.getSexo(), o.getRaca(),
            o.getPorte(), o.getLat(), o.getLon());
    }
}
