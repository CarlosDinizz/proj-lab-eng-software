package com.supets.ocorrencias.ocorrencia.repository;

import com.supets.ocorrencias.ocorrencia.model.Ocorrencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface OcorrenciaRepository extends JpaRepository<Ocorrencia, UUID> {
}
