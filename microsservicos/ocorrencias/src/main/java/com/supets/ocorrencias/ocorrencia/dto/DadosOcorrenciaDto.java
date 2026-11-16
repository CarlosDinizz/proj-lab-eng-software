package com.supets.ocorrencias.ocorrencia.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

/** Campos completos de criação e edição de uma ocorrência. */
public record DadosOcorrenciaDto(
    @NotBlank @Size(max = 255) String titulo,
    @NotBlank String descricao,
    @NotNull @PastOrPresent LocalDate dataOcorrido,
    @NotNull Integer tipoOcorrenciaId,
    @NotBlank @Pattern(regexp = "\\d{5}-?\\d{3}", message = "deve ter 8 dígitos") String cep,
    @NotBlank @Size(max = 255) String endereco,
    @NotBlank(message = "Selecione um município válido para a UF.") @Size(max = 255) String cidade,
    @NotBlank(message = "Informe uma UF válida.") String estado,
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double lon,
    @NotNull @Valid CriarAnimalDto animal
) {}
