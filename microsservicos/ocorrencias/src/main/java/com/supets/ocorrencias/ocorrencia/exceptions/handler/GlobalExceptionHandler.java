package com.supets.ocorrencias.ocorrencia.exceptions.handler;

import com.supets.ocorrencias.ocorrencia.exceptions.TipoOcorrenciaNotFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    /**
     * Controle de erros de validação.
     * <br>Por exemplo, um atributo necessário (@NotNull) em um dto não foi apresentado.
     * */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        Map<String, String> erros = new HashMap<>();
        exception.getBindingResult().getAllErrors().forEach((erro) -> {
            String campo = ((FieldError) erro).getField();
            String mensagem = erro.getDefaultMessage();
            erros.put(campo, mensagem);
        });
        return handleExceptionInternal(exception, erros, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException exception, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        return handleExceptionInternal(exception, Map.of("body", "Corpo da requisição inválido."), headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(
            TypeMismatchException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String campo = exception.getPropertyName() == null ? "parametro" : exception.getPropertyName();
        return handleExceptionInternal(exception, Map.of(campo, "Valor inválido."), headers, status, request);
    }

    @ExceptionHandler(TipoOcorrenciaNotFoundException.class)
    public ResponseEntity<Map<String, String>> tipoNaoEncontrado(TipoOcorrenciaNotFoundException exception) {
        return ResponseEntity.badRequest().body(Map.of("tipoOcorrenciaId", "Tipo de ocorrência não encontrado."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> erroDeStatus(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
    }
}
