package com.supets.ocorrencias.ocorrencia.dto;

import com.supets.ocorrencias.ocorrencia.model.StatusOcorrencia;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AtualizarStatusDto(@NotNull StatusOcorrencia status, UUID ongId) {}
