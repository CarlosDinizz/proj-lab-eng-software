package com.supets.community.ong.service;

import com.supets.community.ong.dto.OngDto;
import com.supets.community.shared.dto.CredencialDto;
import java.util.Optional;
import java.util.UUID;

public interface ONGService {
    UUID createOng(OngDto request);
    String getOng(Integer id);
    Optional<CredencialDto> buscarCredencial(String email);
}
