package com.supets.ocorrencias.ocorrencia.service;

import com.supets.ocorrencias.ocorrencia.dto.OcorrenciaDto;
import com.supets.ocorrencias.ocorrencia.model.TipoOcorrencia;

import java.util.List;

public interface TipoOcorrenciaService {

    public List<TipoOcorrencia> getTipoOcorrencias(List<OcorrenciaDto> ocorrencias);
    public TipoOcorrencia getTipoOcorrencia(OcorrenciaDto ocorrencia);
}
