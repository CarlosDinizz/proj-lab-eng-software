package com.supets.ocorrencias.ocorrencia.repository;

import com.supets.community.ocorrencias.ocorrencias.TipoOcorrencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TipoContatoRepository extends JpaRepository<TipoOcorrencia, Integer> {
    Optional<TipoOcorrencia> findByTipo(String tipo);
}
