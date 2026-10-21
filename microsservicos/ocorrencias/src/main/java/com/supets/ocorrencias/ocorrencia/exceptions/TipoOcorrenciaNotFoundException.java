package com.supets.ocorrencias.ocorrencia.exceptions;

public class TipoOcorrenciaNotFoundException extends RuntimeException {

    public TipoOcorrenciaNotFoundException() {
        super("Tipo de contato não encontrado.");
    }

    public TipoOcorrenciaNotFoundException(String message) {
        super(message);
    }
}
