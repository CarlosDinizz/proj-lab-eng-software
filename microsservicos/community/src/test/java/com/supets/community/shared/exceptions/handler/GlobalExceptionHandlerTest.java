package com.supets.community.shared.exceptions.handler;

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

    @Test
    void sharedApiExceptionPreservesStatusAndFieldMap() {
        var handler = new GlobalExceptionHandler();
        var exception = new com.supets.community.shared.exceptions.ApiException(
            org.springframework.http.HttpStatus.BAD_REQUEST, "municipio", "Selecione um município válido para a UF.");
        var response = handler.erroDeApi(exception);
        org.assertj.core.api.Assertions.assertThat(response.getStatusCode().value()).isEqualTo(400);
        org.assertj.core.api.Assertions.assertThat(response.getBody()).containsExactlyEntriesOf(
            java.util.Map.of("municipio", "Selecione um município válido para a UF."));
    }
}
