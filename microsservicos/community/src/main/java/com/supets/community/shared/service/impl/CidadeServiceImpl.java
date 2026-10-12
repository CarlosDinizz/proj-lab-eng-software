package com.supets.community.shared.service.impl;

import com.supets.community.shared.dto.CidadeDto;
import com.supets.community.shared.dto.EstadoDto;
import com.supets.community.shared.exceptions.CidadeAlreadyExistsException;
import com.supets.community.shared.exceptions.CidadeNotFoundException;
import com.supets.community.shared.exceptions.EstadoNotFoundException;
import com.supets.community.shared.model.Cidade;
import com.supets.community.shared.model.Estado;
import com.supets.community.shared.repository.CidadeRepository;
import com.supets.community.shared.repository.EstadoRepository;
import com.supets.community.shared.service.CidadeService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CidadeServiceImpl implements CidadeService {

    private final CidadeRepository repository;
    private final EstadoRepository estadoRepository;

    @Autowired
    public CidadeServiceImpl(CidadeRepository repository, EstadoRepository estadoRepository) {
        this.repository = repository;
        this.estadoRepository = estadoRepository;
    }

    @Transactional
    public Cidade saveCidade(CidadeDto request, String uf) {
        Optional<Cidade> cidade = repository.findByNome(request.nome());

        if (cidade.isPresent()) throw new CidadeAlreadyExistsException();

        Cidade novaCidade = new Cidade();
        novaCidade.setNome(request.nome());

        Estado estado = estadoRepository.findByUf(uf).orElseThrow(EstadoNotFoundException::new);

        novaCidade.setEstado(estado);

        return repository.save(novaCidade);
    }

    @ApplicationModuleListener
    public Cidade getCidade(String nome) {
        return repository.findByNome(nome).orElse(null);
    }

}
