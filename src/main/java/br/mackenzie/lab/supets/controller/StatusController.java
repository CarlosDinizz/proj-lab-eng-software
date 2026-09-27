package br.mackenzie.lab.supets.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Verificar se o deploy subiu. */
@RestController
@RequestMapping("/api")
public class StatusController {

    private final String versao;

    public StatusController(@Value("${supets.versao}") String versao) {
        this.versao = versao;
    }

    @GetMapping("/status")
    public Status status() {
        return new Status("UP", versao);
    }

    public record Status(String status, String versao) {}
}
