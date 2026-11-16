package com.supets.community.campanha.repository;

import com.supets.community.campanha.model.Campanha;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CampanhaRepository extends JpaRepository<Campanha, UUID> {
    List<Campanha> findByOngId(UUID ongId);
}