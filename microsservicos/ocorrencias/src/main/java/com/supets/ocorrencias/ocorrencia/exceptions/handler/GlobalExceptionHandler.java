package com.supets.ocorrencias.ocorrencia.exceptions.handler;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    /**
     * Controle de erros de validação.
     * <br>Por exemplo, um atributo necessário (@NotNull) em um dto não foi apresentado.
     * */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> handleMethodArgumentNotValidException(MethodArgumentNotValidException exception) {
        Map<String, String> erros = new HashMap<>();
        exception.getBindingResult().getAllErrors().forEach((erro) -> {
            String campo = ((FieldError) erro).getField();
            String mensagem = erro.getDefaultMessage();
            erros.put(campo, mensagem);
        });
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(erros);
    }

}
