package com.supets.community.shared.exceptions;

public class CidadeAlreadyExistsException extends RuntimeException {

    public CidadeAlreadyExistsException() {
        super("Cidade já foi registrada.");
    }

    public CidadeAlreadyExistsException(String message) {
        super(message);
    }
}
