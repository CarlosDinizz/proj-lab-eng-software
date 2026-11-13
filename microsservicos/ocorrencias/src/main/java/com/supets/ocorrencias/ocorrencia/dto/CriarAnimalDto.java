package com.supets.ocorrencias.ocorrencia.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** "Informações do animal" do wireframe. Só a espécie é obrigatória. */
public record CriarAnimalDto(
    @Size(max = 255) String nome,
    @NotNull Integer especieId,
    Integer sexoId,
    @Size(max = 255) String raca,
    Integer porteId
) {}
