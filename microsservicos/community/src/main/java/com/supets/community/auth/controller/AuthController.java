package com.supets.community.auth.controller;

import com.supets.community.auth.dto.LoginDto;
import com.supets.community.auth.dto.LoginRespostaDto;
import com.supets.community.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService service;

    public AuthController(AuthService service) { this.service = service; }

    @PostMapping("/api/v1/login")
    public ResponseEntity<LoginRespostaDto> login(@Valid @RequestBody LoginDto request) {
        return ResponseEntity.ok(service.login(request));
    }
}
