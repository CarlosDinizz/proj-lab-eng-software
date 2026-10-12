package com.supets.community.shared.service;

import com.supets.community.shared.dto.EstadoDto;
import com.supets.community.shared.model.Estado;

public interface EstadoService {

    Estado getEstado(String uf);
    Estado saveEstado(EstadoDto request);

}
