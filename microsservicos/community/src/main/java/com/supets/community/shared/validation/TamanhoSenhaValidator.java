package com.supets.community.shared.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.nio.charset.StandardCharsets;

public class TamanhoSenhaValidator implements ConstraintValidator<TamanhoSenha, String> {
    @Override
    public boolean isValid(String senha, ConstraintValidatorContext context) {
        return senha == null || senha.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
