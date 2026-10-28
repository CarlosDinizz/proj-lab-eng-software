package com.supets.ocorrencias.ocorrencia.repository;

import com.supets.ocorrencias.ocorrencia.model.Ocorrencia;
import com.supets.ocorrencias.ocorrencia.model.StatusOcorrencia;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OcorrenciaRepository extends JpaRepository<Ocorrencia, UUID> {
    List<Ocorrencia> findAllByOrderByCreatedAtDesc();
    List<Ocorrencia> findByStatusOrderByCreatedAtDesc(StatusOcorrencia status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Ocorrencia o where o.id = ?1")
    Optional<Ocorrencia> findByIdForUpdate(UUID id);
}
