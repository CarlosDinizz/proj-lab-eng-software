package com.supets.community.campanha.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Locale;

public record CampanhaDto(
    @NotBlank(message = "Informe o título.") @Size(max = 255, message = "Use no máximo 255 caracteres.") String titulo,
    @NotBlank(message = "Descreva a campanha.") @Size(max = 5000, message = "Use no máximo 5000 caracteres.") String descricao,
    @NotNull(message = "Informe a data de início.") LocalDate dataInicio,
    @NotNull(message = "Informe a data de fim.") LocalDate dataFim,
    @NotNull(message = "Selecione o tipo da campanha.") Integer tipoCampanhaId,
    @NotBlank(message = "Informe o CEP.") @Pattern(regexp = "[0-9]{8}", message = "O CEP deve ter 8 dígitos.") String cep,
    @NotBlank(message = "Informe o endereço.") @Size(max = 255, message = "Use no máximo 255 caracteres.") String endereco,
    @NotBlank(message = "Informe a cidade.") @Size(max = 255, message = "Use no máximo 255 caracteres.") String cidade,
    @NotBlank(message = "Selecione o estado.") @Pattern(regexp = "[A-Z]{2}", message = "O estado deve ter 2 letras.") String estado
) {
    public CampanhaDto {
        if (titulo != null) titulo = titulo.trim();
        if (descricao != null) descricao = descricao.trim();
        if (cep != null) cep = cep.replaceAll("[.\\- ]", "");
        if (endereco != null) endereco = endereco.trim();
        if (cidade != null) cidade = cidade.trim();
        if (estado != null) estado = estado.trim().toUpperCase(Locale.ROOT);
    }
}