package com.supets.community.cidadao.service;

import com.supets.community.cidadao.dto.CidadaoDto;
import java.util.UUID;

public interface CidadaoService {
    UUID createCidadao(CidadaoDto request);
    String getCidadao(Integer id);
}
