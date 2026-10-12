package com.supets.community.shared.exceptions;

public class TipoContatoNotFoundException extends RuntimeException {

    public TipoContatoNotFoundException() {
        super("Tipo de contato não encontrado.");
    }

    public TipoContatoNotFoundException(String message) {
        super(message);
    }
}
