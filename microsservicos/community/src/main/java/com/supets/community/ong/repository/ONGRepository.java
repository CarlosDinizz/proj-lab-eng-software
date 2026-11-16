package com.supets.community.ong.repository;

import com.supets.community.ong.model.ONG;
import com.supets.community.shared.dto.PerfilRespostaDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import java.util.UUID;

@Repository
public interface ONGRepository extends JpaRepository<ONG, UUID> {
    @Query("select new com.supets.community.shared.dto.PerfilRespostaDto(o.id, o.nome, com.supets.community.shared.enums.PerfilEnum.ONG) from ONG o where o.id = :id")
    Optional<PerfilRespostaDto> findPerfilById(UUID id);
    boolean existsByCnpj(String cnpj);
    @Query(value = "SELECT EXISTS(SELECT 1 FROM ong WHERE lower(btrim(email)) = lower(btrim(:email)))", nativeQuery = true)
    boolean existsByEmailIgnoreCase(String email);
    @Query(value = "SELECT * FROM ong WHERE lower(btrim(email)) = lower(btrim(:email))", nativeQuery = true)
    List<ONG> findByEmailIgnoreCase(String email);
}
