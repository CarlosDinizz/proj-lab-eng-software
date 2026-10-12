package com.supets.community.shared.mapper;

import com.supets.community.shared.dto.EstadoDto;
import com.supets.community.shared.model.Estado;

public class EstadoMapper {

    public static Estado toEstado(EstadoDto request) {
        Estado estado = new Estado();

        estado.setUf(request.uf());
        estado.setNome(request.nome());

        return estado;
    }

}
