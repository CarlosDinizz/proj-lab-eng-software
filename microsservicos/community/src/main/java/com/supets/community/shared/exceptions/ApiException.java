package com.supets.community.shared.exceptions;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String campo;

    public ApiException(HttpStatus status, String mensagem) {
        this(status, "message", mensagem);
    }

    public ApiException(HttpStatus status, String campo, String mensagem) {
        super(mensagem);
        this.status = status;
        this.campo = campo;
    }

    public HttpStatus getStatus() { return status; }

    public String getCampo() { return campo; }
}