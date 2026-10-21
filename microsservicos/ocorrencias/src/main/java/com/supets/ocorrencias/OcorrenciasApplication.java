package com.supets.ocorrencias;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class OcorrenciasApplication {

	public static void main(String[] args) {
		SpringApplication.run(OcorrenciasApplication.class, args);
	}

}
