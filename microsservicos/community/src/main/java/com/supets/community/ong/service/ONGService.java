package com.supets.community.ong.service;

import com.supets.community.ong.dto.OngDto;
import com.supets.community.shared.dto.CredencialDto;
import com.supets.community.shared.dto.PerfilRespostaDto;
import java.util.List;
import java.util.UUID;

public interface ONGService {
    UUID createOng(OngDto request);
    PerfilRespostaDto getOng(UUID id);
    List<CredencialDto> buscarCredenciais(String email);
}
