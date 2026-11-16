package com.supets.community.shared.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CnpjValidoValidator implements ConstraintValidator<CnpjValido, String> {
    @Override
    public boolean isValid(String valor, ConstraintValidatorContext context) {
        return Documentos.cnpjValido(valor);
    }
}
