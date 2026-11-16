package com.supets.community.campanha.exceptions;

import org.springframework.http.HttpStatus;

public class CampanhaException extends RuntimeException {
    private final HttpStatus status;
    private final String campo;

    public CampanhaException(HttpStatus status, String mensagem) {
        this(status, "message", mensagem);
    }

    public CampanhaException(HttpStatus status, String campo, String mensagem) {
        super(mensagem);
        this.status = status;
        this.campo = campo;
    }

    public HttpStatus getStatus() { return status; }

    public String getCampo() { return campo; }
}