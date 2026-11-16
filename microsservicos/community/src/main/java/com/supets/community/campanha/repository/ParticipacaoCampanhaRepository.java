package com.supets.community.campanha.repository;

import com.supets.community.campanha.model.ParticipacaoCampanha;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ParticipacaoCampanhaRepository extends JpaRepository<ParticipacaoCampanha, Long> {
    boolean existsByCampanhaIdAndCidadaoId(UUID campanhaId, UUID cidadaoId);

    long countByCampanhaId(UUID campanhaId);

    @Query("select p.campanhaId from ParticipacaoCampanha p where p.cidadaoId = ?1")
    List<UUID> findCampanhaIdsByCidadaoId(UUID cidadaoId);

    @Query("select p.campanhaId, count(p) from ParticipacaoCampanha p where p.campanhaId in ?1 group by p.campanhaId")
    List<Object[]> contarPorCampanha(Collection<UUID> campanhaIds);
}