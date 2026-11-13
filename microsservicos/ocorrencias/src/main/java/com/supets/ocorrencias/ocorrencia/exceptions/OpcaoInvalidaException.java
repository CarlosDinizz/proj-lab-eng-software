package com.supets.ocorrencias.ocorrencia.exceptions;

/** Um id de lista (espécie, sexo, porte) que não existe. Vira 400 {campo: mensagem}. */
public class OpcaoInvalidaException extends RuntimeException {
    private final String campo;

    public OpcaoInvalidaException(String campo, String mensagem) {
        super(mensagem);
        this.campo = campo;
    }

    public String getCampo() {
        return campo;
    }
}
