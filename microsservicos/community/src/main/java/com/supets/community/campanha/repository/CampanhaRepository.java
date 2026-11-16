package com.supets.community.campanha.repository;

import com.supets.community.campanha.model.Campanha;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface CampanhaRepository extends JpaRepository<Campanha, UUID> {
    List<Campanha> findByOngId(UUID ongId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Campanha c where c.id = :id")
    Optional<Campanha> findByIdForUpdate(UUID id);
}