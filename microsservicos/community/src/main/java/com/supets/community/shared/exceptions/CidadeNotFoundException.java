package com.supets.community.shared.exceptions;

public class CidadeNotFoundException extends RuntimeException {
    public CidadeNotFoundException() {
        super("Cidade não cadastrada.");
    }

    public CidadeNotFoundException(String message) {
        super(message);
    }
}
