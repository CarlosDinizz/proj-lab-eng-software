package com.supets.ocorrencias.ocorrencia.repository;

import com.supets.ocorrencias.ocorrencia.model.Ocorrencia;
import com.supets.ocorrencias.ocorrencia.model.StatusOcorrencia;
import com.supets.ocorrencias.ocorrencia.enums.PerfilEnum;
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
    @Query("""
        select o from Ocorrencia o where (:status is null or o.status = :status)
        and o.lat between :sul and :norte
        and (:todas = true or (:envolve = false and o.lon between :oeste and :leste)
             or (:envolve = true and (o.lon >= :oeste or o.lon <= :leste)))
        """)
    List<Ocorrencia> buscarNaRegiao(StatusOcorrencia status, double sul, double norte,
        boolean todas, boolean envolve, double oeste, double leste);

    @Query("""
        select o from Ocorrencia o where
        (:perfil = com.supets.ocorrencias.ocorrencia.enums.PerfilEnum.CIDADAO and o.cidadaoId = :id)
        or (o.responsavelId = :id and o.responsavelPerfil = :perfil) order by o.createdAt desc
        """)
    List<Ocorrencia> buscarMinhas(UUID id, PerfilEnum perfil);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Ocorrencia o where o.id = ?1")
    Optional<Ocorrencia> findByIdForUpdate(UUID id);
}
