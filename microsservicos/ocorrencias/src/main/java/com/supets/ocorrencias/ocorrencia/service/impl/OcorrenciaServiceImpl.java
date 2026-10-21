package com.supets.community.cidadao.service.impl;


import com.supets.community.cidadao.service.CidadaoService;
import org.springframework.stereotype.Service;

@Service
public class OcorrenciaServiceImpl implements OcorrenciaService {

    @Override
    public void createOcorrencia() {
        System.out.println("Ocorrência criada.");
    }

    @Override
    public String getOcorrencia(Integer id) {
        return "Ocorrência -  " + id;
    }
}
