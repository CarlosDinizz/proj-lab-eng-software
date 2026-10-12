package com.supets.community.ong.controller;

import com.supets.community.ong.dto.OngDto;
import com.supets.community.ong.service.ONGService;
import lombok.extern.slf4j.Slf4j;
import org.apache.coyote.Response;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@Slf4j
@RequestMapping("/ong")
public class ONGController {

    private final ONGService service;

    public ONGController(ONGService service) {
        this.service = service;
    }

    @PostMapping("/api/v1")
    public ResponseEntity<Void> createOng(@RequestBody OngDto request) {
        log.info("POST: /ong/api/v1");
        service.createOng(request);
        log.info("200 POST: /ong/api/v1");
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/api/v1/{id}")
    public ResponseEntity<String> getOng(@PathVariable Integer id) {
        String ong = service.getOng(id);
        return ResponseEntity.ok(ong);
    }
}
