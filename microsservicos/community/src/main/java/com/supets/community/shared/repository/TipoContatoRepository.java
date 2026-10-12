package com.supets.community.shared.repository;

import com.supets.community.shared.model.TipoContato;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TipoContatoRepository extends JpaRepository<TipoContato, Integer> {
    Optional<TipoContato> findByTipo(String tipo);
}
