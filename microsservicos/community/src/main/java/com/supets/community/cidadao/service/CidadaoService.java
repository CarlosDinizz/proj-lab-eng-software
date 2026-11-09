package com.supets.community.cidadao.service;

import com.supets.community.cidadao.dto.CidadaoDto;
import com.supets.community.shared.dto.CredencialDto;
import java.util.Optional;
import java.util.UUID;

public interface CidadaoService {
    UUID createCidadao(CidadaoDto request);
    String getCidadao(Integer id);
    Optional<CredencialDto> buscarCredencial(String email);
}
