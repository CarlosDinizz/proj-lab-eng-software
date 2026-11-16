package com.supets.community.shared.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CpfValidoValidator implements ConstraintValidator<CpfValido, String> {
    @Override
    public boolean isValid(String valor, ConstraintValidatorContext context) {
        return Documentos.cpfValido(valor);
    }
}
