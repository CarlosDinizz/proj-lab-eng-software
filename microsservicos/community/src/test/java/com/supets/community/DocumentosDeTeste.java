package com.supets.community;

import java.util.concurrent.ThreadLocalRandom;

/** Synthetic check-digit fixtures do not represent verified registered identities. */
public final class DocumentosDeTeste {
    private DocumentosDeTeste() {}
    public static String cpf() { return numero(11); }
    public static String cnpj() { return numero(14); }
    public static String numero(int tamanho) {
        StringBuilder base = new StringBuilder();
        for (int i = 0; i < tamanho - 2; i++) base.append(ThreadLocalRandom.current().nextInt(10));
        if (base.chars().distinct().count() == 1) base.setCharAt(0, base.charAt(0) == '9' ? '0' : (char) (base.charAt(0) + 1));
        for (int dv = 0; dv < 2; dv++) {
            int soma = 0;
            int peso = tamanho == 11 ? base.length() + 1 : dv == 0 ? 5 : 6;
            for (int i = 0; i < base.length(); i++) {
                soma += (base.charAt(i) - '0') * peso;
                peso--;
                if (tamanho == 14 && peso == 1) peso = 9;
            }
            int resto = soma % 11;
            base.append(resto < 2 ? 0 : 11 - resto);
        }
        return base.toString();
    }
}
