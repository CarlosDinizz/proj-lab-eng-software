package com.supets.community.shared.validation;

import java.util.Locale;
import java.util.regex.Pattern;

/** Check digits validate syntax, not ownership or registration with the government. */
public final class Documentos {
    private static final Pattern CPF = Pattern.compile("[0-9]{11}");
    private static final Pattern CNPJ = Pattern.compile("[A-Z0-9]{12}[0-9]{2}");
    private static final int[] PESOS = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
    private Documentos() {}

    public static String normalizar(String valor) {
        return valor == null ? null : valor.replaceAll("[.\\-/\\s]", "").toUpperCase(Locale.ROOT);
    }

    public static boolean cpfValido(String valor) {
        String cpf = normalizar(valor);
        return cpf != null && CPF.matcher(cpf).matches() && cpf.chars().distinct().count() != 1
            && digitoCpf(cpf, 9) == cpf.charAt(9) - '0'
            && digitoCpf(cpf, 10) == cpf.charAt(10) - '0';
    }

    private static int digitoCpf(String cpf, int quantidade) {
        int soma = 0;
        for (int i = 0; i < quantidade; i++) soma += (cpf.charAt(i) - '0') * (quantidade + 1 - i);
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    public static boolean cnpjValido(String valor) {
        String cnpj = normalizar(valor);
        return cnpj != null && CNPJ.matcher(cnpj).matches() && cnpj.chars().distinct().count() != 1
            && digitoCnpj(cnpj, 12) == cnpj.charAt(12) - '0'
            && digitoCnpj(cnpj, 13) == cnpj.charAt(13) - '0';
    }

    private static int digitoCnpj(String cnpj, int quantidade) {
        int soma = 0;
        for (int i = 0; i < quantidade; i++) soma += (cnpj.charAt(i) - 48) * PESOS[i + 13 - quantidade];
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
