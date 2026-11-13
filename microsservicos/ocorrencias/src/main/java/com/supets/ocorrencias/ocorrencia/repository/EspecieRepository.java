package com.supets.ocorrencias.ocorrencia.repository;

import com.supets.ocorrencias.ocorrencia.model.Especie;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EspecieRepository extends JpaRepository<Especie, Integer> {}
