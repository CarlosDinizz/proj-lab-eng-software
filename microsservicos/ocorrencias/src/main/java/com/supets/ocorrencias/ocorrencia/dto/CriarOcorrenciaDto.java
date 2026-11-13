package com.supets.ocorrencias.ocorrencia.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

/** Campos do wireframe "Criar nova ocorrência". */
public record CriarOcorrenciaDto(
    @NotBlank @Size(max = 255) String titulo,
    @NotBlank String descricao,
    @NotNull @PastOrPresent LocalDate dataOcorrido,
    @NotNull Integer tipoOcorrenciaId,
    @NotBlank @Pattern(regexp = "\\d{5}-?\\d{3}", message = "deve ter 8 dígitos") String cep,
    @NotBlank @Size(max = 255) String endereco,
    @NotBlank @Size(max = 255) String cidade,
    @NotBlank @Pattern(regexp = "[A-Za-z]{2}", message = "deve conter duas letras") String estado,
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double lon,
    @NotNull @Valid CriarAnimalDto animal
) {}
