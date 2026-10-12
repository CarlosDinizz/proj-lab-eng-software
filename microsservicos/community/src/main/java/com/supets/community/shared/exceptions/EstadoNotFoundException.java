package com.supets.community.shared.exceptions;

public class EstadoNotFoundException extends RuntimeException {

    public EstadoNotFoundException() {
        super("Estado não encontrado.");
    }

    public EstadoNotFoundException(String message) {
        super(message);
    }
}
