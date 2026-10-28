package com.supets.ocorrencias.ocorrencia.dto;

import jakarta.validation.constraints.*;
import java.util.UUID;

public record CriarOcorrenciaDto(
    @NotBlank @Size(max = 255) String titulo,
    @NotBlank String descricao,
    @NotNull Integer tipoOcorrenciaId,
    @NotNull UUID cidadaoId,
    @NotBlank @Size(max = 255) String endereco,
    @NotBlank @Size(max = 255) String cidade,
    @NotBlank @Pattern(regexp = "[A-Za-z]{2}", message = "deve conter duas letras") String estado,
    @NotBlank @Size(max = 255) String especie,
    @Size(max = 255) String nomeAnimal,
    @Size(max = 255) String sexo,
    @Size(max = 255) String raca,
    @Size(max = 255) String porte,
    Double lat,
    Double lon
) {}
