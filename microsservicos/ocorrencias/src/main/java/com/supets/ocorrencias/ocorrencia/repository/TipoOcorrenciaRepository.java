package com.supets.ocorrencias.ocorrencia.repository;

import com.supets.ocorrencias.ocorrencia.model.TipoOcorrencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TipoOcorrenciaRepository extends JpaRepository<TipoOcorrencia, Integer> {
    Optional<TipoOcorrencia> findByTipo(String tipo);
}
