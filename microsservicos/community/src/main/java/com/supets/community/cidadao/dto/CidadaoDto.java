package com.supets.community.cidadao.dto;

import com.supets.community.shared.validation.TamanhoSenha;
import com.supets.community.shared.validation.CpfValido;
import com.supets.community.shared.validation.Documentos;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Locale;

public record CidadaoDto(
    @NotBlank(message = "Nome é obrigatório") @Size(max = 255) String nome,
    @CpfValido String cpf,
    @NotBlank(message = "CEP é obrigatório") @Pattern(regexp = "[0-9]{8}", message = "CEP deve ter 8 dígitos") String cep,
    @NotBlank(message = "Endereço é obrigatório") @Size(max = 255) String endereco,
    @NotBlank(message = "Município é obrigatório") @Size(max = 255) String municipio,
    @NotBlank(message = "Informe uma UF válida.") @Pattern(regexp = "[a-zA-Z]{2}", message = "Informe uma UF válida.") String estado,
    @NotBlank(message = "E-mail é obrigatório") @Email(message = "E-mail inválido") @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "E-mail inválido") @Size(max = 255) String email,
    @TamanhoSenha @NotBlank(message = "Senha é obrigatória") @Size(min = 8, message = "Senha deve ter pelo menos 8 caracteres")
    @Pattern(regexp = "(?s)(?=.*\\p{L})(?=.*[0-9]).*", message = "Senha deve conter uma letra e um número") String senha
) {
    public CidadaoDto {
        cpf = Documentos.normalizar(cpf);
        if (cep != null) cep = cep.replaceAll("[.\\-/ ]", "");
        if (email != null) email = email.trim().toLowerCase(Locale.ROOT);
        if (estado != null) estado = estado.trim().toUpperCase(Locale.ROOT);
    }

    @Override
    public String toString() {
        return "CidadaoDto[nome=" + nome + ", cpf=" + cpf + ", cep=" + cep
            + ", endereco=" + endereco + ", municipio=" + municipio + ", estado=" + estado
            + ", email=" + email + ", senha=***]";
    }
}
