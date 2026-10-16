package com.supets.community.shared.service.impl;

import com.supets.community.shared.dto.LocalDto;
import com.supets.community.shared.model.Cidade;
import com.supets.community.shared.model.Estado;
import com.supets.community.shared.model.Local;
import com.supets.community.shared.repository.LocalRepository;
import com.supets.community.shared.service.CidadeService;
import com.supets.community.shared.service.EstadoService;
import com.supets.community.shared.service.LocalService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class LocalServiceImpl implements LocalService {

    private final LocalRepository repository;
    private final EstadoService estadoService;
    private final CidadeService cidadeService;

    @Autowired
    public LocalServiceImpl(LocalRepository repository, EstadoService estadoService, CidadeService cidadeService) {
        this.repository = repository;
        this.estadoService = estadoService;
        this.cidadeService = cidadeService;
    }


    @Override
    @Transactional
    public Local saveLocal(LocalDto request) {
        Local local = new Local();
        local.setEndereco(request.endereco());
        local.setComplemento(request.complemento());
        local.setNumero(request.numero());

        Estado estado = estadoService.getEstado(request.estado().uf());

        if (estado == null) {
            estado = estadoService.saveEstado(request.estado());
        }

        Cidade cidade = cidadeService.getCidade(request.cidade().nome());

        if (cidade == null) {
            cidade = cidadeService.saveCidade(request.cidade(), estado.getUf());
        }

        local.setEstado(estado);
        local.setCidade(cidade);

        return repository.save(local);
    }

}
