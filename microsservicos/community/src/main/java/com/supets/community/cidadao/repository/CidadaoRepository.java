package com.supets.community.cidadao.repository;

import com.supets.community.cidadao.model.Cidadao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CidadaoRepository extends JpaRepository<Cidadao, UUID> {
    boolean existsByEmailIgnoreCase(String email);
    Optional<Cidadao> findByEmailIgnoreCase(String email);
    boolean existsByCpf(String cpf);
}
