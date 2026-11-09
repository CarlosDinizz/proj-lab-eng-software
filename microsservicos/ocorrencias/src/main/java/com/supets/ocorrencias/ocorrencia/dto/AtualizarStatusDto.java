package com.supets.ocorrencias.ocorrencia.dto;

import com.supets.ocorrencias.ocorrencia.model.StatusOcorrencia;
import jakarta.validation.constraints.NotNull;

public record AtualizarStatusDto(@NotNull StatusOcorrencia status) {}
