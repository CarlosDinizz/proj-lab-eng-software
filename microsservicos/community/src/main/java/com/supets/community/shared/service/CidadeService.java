package com.supets.community.shared.service;

import com.supets.community.shared.dto.CidadeDto;
import com.supets.community.shared.model.Cidade;

public interface CidadeService {

    public Cidade saveCidade(CidadeDto request, String uf);
    public Cidade getCidade(String nome);

}
