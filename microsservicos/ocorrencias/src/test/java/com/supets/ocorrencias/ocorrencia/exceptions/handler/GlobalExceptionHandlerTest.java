package com.supets.ocorrencias.ocorrencia.exceptions.handler;

import org.junit.jupiter.api.Test;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.ExceptionHandlerMethodResolver;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class GlobalExceptionHandlerTest {

    @Test
    void validationExceptionHasAnUnambiguousHandler() {
        var resolver = new ExceptionHandlerMethodResolver(GlobalExceptionHandler.class);
        assertNotNull(resolver.resolveMethodByExceptionType(MethodArgumentNotValidException.class));
    }
}
