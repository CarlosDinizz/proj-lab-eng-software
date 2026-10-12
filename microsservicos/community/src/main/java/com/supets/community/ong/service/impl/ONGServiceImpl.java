package com.supets.community.ong.service.impl;

import com.supets.community.ong.dto.OngDto;
import com.supets.community.ong.exceptions.OngAlreadyExistsException;
import com.supets.community.ong.model.ONG;
import com.supets.community.ong.repository.ONGRepository;
import com.supets.community.ong.service.ONGService;
import com.supets.community.shared.events.SalvarContatosEvent;
import com.supets.community.shared.model.Cidade;
import com.supets.community.shared.model.Estado;
import com.supets.community.shared.model.Local;
import com.supets.community.shared.service.CidadeService;
import com.supets.community.shared.service.EstadoService;
import com.supets.community.shared.service.LocalService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ONGServiceImpl implements ONGService {

    private final ONGRepository repository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final LocalService localService;

    @Autowired
    public ONGServiceImpl(ONGRepository repository, ApplicationEventPublisher applicationEventPublisher, LocalService localService) {
        this.repository = repository;
        this.applicationEventPublisher = applicationEventPublisher;
        this.localService = localService;
    }

    @Override
    @Transactional
    public void createOng(OngDto request) {
        Optional<ONG> ongEncontrada = repository.findByCnpj(request.cnpj());

        if (ongEncontrada.isPresent()) throw new OngAlreadyExistsException();

        ONG ong = new ONG();
        ong.setCnpj(request.cnpj());
        ong.setNome(request.nome());
        ong.setDescricao(request.descricao());

        Local local = localService.saveLocal(request.local());

        ong.setLocal(local);
        ong = repository.save(ong);

        // Salvando contatos da ONG
        applicationEventPublisher.publishEvent(new SalvarContatosEvent(request.contatos(), ong.getId(), null));
    }

    @Override
    public String getOng(Integer id) {
        return "ONG - " + id;
    }
}
