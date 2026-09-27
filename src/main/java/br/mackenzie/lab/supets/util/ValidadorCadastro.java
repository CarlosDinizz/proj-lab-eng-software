package br.mackenzie.lab.supets.util;

import java.util.regex.Pattern;

public class ValidadorCadastro {

    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+");
    private static final Pattern CPF = Pattern.compile("\\d{11}|\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}");

    /** E-mail no formato usuario@dominio.tld. */
    public boolean isEmailValido(String email) {
        return email != null && EMAIL.matcher(email).matches();
    }

    /** Nome com 3 a 100 caracteres. */
    public boolean isNomeValido(String nome) {
        if (nome == null) {
            return false;
        }
        int tamanho = nome.trim().length();
        return tamanho >= 3 && tamanho <= 100;
    }

    /** Idade entre 0 e 130, inclusive. */
    public boolean isIdadeValida(int idade) {
        return idade >= 0 && idade <= 130;
    }

    /** Senha com pelo menos 8 caracteres, uma letra e um dígito. */
    public boolean isSenhaForte(String senha) {
        return senha != null
                && senha.length() >= 8
                && senha.chars().anyMatch(Character::isLetter)
                && senha.chars().anyMatch(Character::isDigit);
    }

    /** CPF com ou sem máscara (000.000.000-00), com dígitos verificadores corretos. */
    public boolean isCpfValido(String cpf) {
        if (cpf == null || !CPF.matcher(cpf).matches()) {
            return false;
        }
        String digitos = cpf.replaceAll("\\D", "");
        if (digitos.chars().distinct().count() == 1) {
            return false;
        }
        return digitoVerificador(digitos, 9) == digitos.charAt(9) - '0'
                && digitoVerificador(digitos, 10) == digitos.charAt(10) - '0';
    }

    /** Calcula o dígito verificador a partir dos {@code quantidade} primeiros dígitos. */
    private static int digitoVerificador(String digitos, int quantidade) {
        int soma = 0;
        for (int i = 0; i < quantidade; i++) {
            soma += (digitos.charAt(i) - '0') * (quantidade + 1 - i);
        }
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
