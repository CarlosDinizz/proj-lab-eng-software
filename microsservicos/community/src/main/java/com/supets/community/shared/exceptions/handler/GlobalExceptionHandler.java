package com.supets.community.shared.exceptions.handler;

import com.supets.community.shared.exceptions.CadastroDuplicadoException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.HttpHeaders;
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

    @ExceptionHandler(CadastroDuplicadoException.class)
    public ResponseEntity<Map<String, String>> cadastroDuplicado(CadastroDuplicadoException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(exception.getCampo(), exception.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> conflitoDeDados(DataIntegrityViolationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("cadastro", "Dados já cadastrados ou inválidos"));
    }

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

}
