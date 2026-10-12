package com.supets.community.shared.service.impl;

import com.supets.community.shared.dto.EstadoDto;
import com.supets.community.shared.mapper.EstadoMapper;
import com.supets.community.shared.model.Estado;
import com.supets.community.shared.repository.EstadoRepository;
import com.supets.community.shared.service.EstadoService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

@Service
public class EstadoServiceImpl implements EstadoService {

    private final EstadoRepository repository;

    public EstadoServiceImpl(EstadoRepository repository) {
        this.repository = repository;
    }

    @Override
    public Estado getEstado(String uf) {
        return repository.findByUf(uf).orElse(null);
    }

    @Override
    @Transactional
    public Estado saveEstado(EstadoDto request) {
        Estado estado = EstadoMapper.toEstado(request);
        return repository.save(estado);
    }
}
