package com.supets.community.campanha.dto;

import com.supets.community.campanha.model.Campanha;
import java.time.LocalDate;
import java.util.UUID;

public record CampanhaRespostaDto(
    UUID id, String titulo, String descricao, LocalDate dataInicio, LocalDate dataFim,
    Integer tipoCampanhaId, String tipoCampanha,
    String cep, String endereco, String cidade, String estado,
    UUID ongId, String ongNome,
    boolean participando, long totalParticipantes
) {
    public static CampanhaRespostaDto de(Campanha c, boolean participando, long totalParticipantes) {
        return new CampanhaRespostaDto(c.getId(), c.getTitulo(), c.getDescricao(), c.getDataInicio(), c.getDataFim(),
            c.getTipoCampanha().getId(), c.getTipoCampanha().getNome(),
            c.getCep(), c.getEndereco(), c.getCidade(), c.getEstado(),
            c.getOngId(), c.getOngNome(),
            participando, totalParticipantes);
    }
}