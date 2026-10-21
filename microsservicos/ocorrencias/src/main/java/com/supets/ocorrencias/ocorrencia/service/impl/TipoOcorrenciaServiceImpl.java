package com.supets.ocorrencias.ocorrencia.service.impl;

import com.supets.ocorrencias.ocorrencia.dto.OcorrenciaDto;
import com.supets.ocorrencias.ocorrencia.exceptions.TipoOcorrenciaNotFoundException;
import com.supets.ocorrencias.ocorrencia.model.TipoOcorrencia;
import com.supets.ocorrencias.ocorrencia.TipoOcorrenciaRepository;
import com.supets.ocorrencias.ocorrencia.service.TipoOcorrenciaService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TipoOcorrenciaServiceImpl implements TipoOcorrenciaService {

    private final TipoOcorrenciaRepository repository;

    public TipoOcorrenciaServiceImpl(TipoOcorrenciaRepository repository) {
        this.repository = repository;
    }

    public List<TipoOcorrencia> getTipoOcorrencias(List<OcorrenciaDto> ocorrencias) {
        return ocorrencias.stream().map(this::getTipoOcorrencia).toList();
    }

    public TipoOcorrencia getTipoOcorrencia(OcorrenciaDto ocorrencia) {
        return repository.findByTipo(ocorrencia.tipo()).orElseThrow(TipoOcorrenciaNotFoundException::new);
    }
}
