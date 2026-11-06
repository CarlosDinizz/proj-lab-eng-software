package com.supets.community.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.Locale;

public record LoginDto(
    @NotBlank(message = "E-mail é obrigatório") @Email(message = "E-mail inválido") String email,
    @NotBlank(message = "Senha é obrigatória") String senha
) {
    public LoginDto {
        if (email != null) email = email.trim().toLowerCase(Locale.ROOT);
    }

    @Override
    public String toString() { return "LoginDto[email=" + email + ", senha=***]"; }
}
