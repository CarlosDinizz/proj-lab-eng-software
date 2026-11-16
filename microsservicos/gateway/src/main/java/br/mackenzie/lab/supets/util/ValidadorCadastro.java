package br.mackenzie.lab.supets.util;

import java.util.regex.Pattern;

public class ValidadorCadastro {

    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+");

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

}
