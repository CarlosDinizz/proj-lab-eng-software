package com.supets.community.ong.exceptions;

public class OngAlreadyExistsException extends RuntimeException {
    public OngAlreadyExistsException() {
        super("ONG já cadastrada no sistema.");
    }
    public OngAlreadyExistsException(String message) {
        super(message);
    }

}
