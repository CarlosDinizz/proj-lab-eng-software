package com.supets.community.cidadao.service;

import com.supets.community.cidadao.dto.CidadaoDto;
import com.supets.community.shared.dto.CredencialDto;
import com.supets.community.shared.dto.PerfilRespostaDto;
import java.util.List;
import java.util.UUID;

public interface CidadaoService {
    UUID createCidadao(CidadaoDto request);
    PerfilRespostaDto getCidadao(UUID id);
    List<CredencialDto> buscarCredenciais(String email);
}
