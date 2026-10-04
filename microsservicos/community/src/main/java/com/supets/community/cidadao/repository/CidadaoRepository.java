package com.supets.community.cidadao.repository;

import com.supets.community.cidadao.model.Cidadao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CidadaoRepository extends JpaRepository<Cidadao, UUID> {
}
