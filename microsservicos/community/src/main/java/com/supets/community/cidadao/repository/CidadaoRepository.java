package com.supets.community.cidadao.repository;

import com.supets.community.cidadao.model.Cidadao;
import com.supets.community.shared.dto.PerfilRespostaDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import java.util.UUID;

@Repository
public interface CidadaoRepository extends JpaRepository<Cidadao, UUID> {
    @Query("select new com.supets.community.shared.dto.PerfilRespostaDto(c.id, c.nome, com.supets.community.shared.enums.PerfilEnum.CIDADAO) from Cidadao c where c.id = :id")
    Optional<PerfilRespostaDto> findPerfilById(UUID id);
    @Query(value = "SELECT EXISTS(SELECT 1 FROM cidadao WHERE lower(btrim(email)) = lower(btrim(:email)))", nativeQuery = true)
    boolean existsByEmailIgnoreCase(String email);
    @Query(value = "SELECT * FROM cidadao WHERE lower(btrim(email)) = lower(btrim(:email))", nativeQuery = true)
    List<Cidadao> findByEmailIgnoreCase(String email);
    boolean existsByCpf(String cpf);
}
