package com.supets.community.ong.repository;

import com.supets.community.ong.model.ONG;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ONGRepository extends JpaRepository<ONG, UUID> {
}
