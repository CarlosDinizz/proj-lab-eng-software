package com.supets.community.campanha.exceptions.handler;

import com.supets.community.campanha.controller.CampanhaController;
import com.supets.community.campanha.exceptions.CampanhaException;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = CampanhaController.class)
public class CampanhaExceptionHandler {

    @ExceptionHandler(CampanhaException.class)
    public ResponseEntity<Map<String, String>> erroDeCampanha(CampanhaException exception) {
        return ResponseEntity.status(exception.getStatus()).body(Map.of(exception.getCampo(), exception.getMessage()));
    }
}