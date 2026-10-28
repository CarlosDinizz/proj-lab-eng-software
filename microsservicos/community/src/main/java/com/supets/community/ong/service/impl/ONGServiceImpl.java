package com.supets.community.ong.service.impl;

import com.supets.community.ong.dto.OngDto;
import com.supets.community.ong.model.ONG;
import com.supets.community.ong.repository.ONGRepository;
import com.supets.community.ong.service.ONGService;
import com.supets.community.cidadao.repository.CidadaoRepository;
import com.supets.community.shared.exceptions.CadastroDuplicadoException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class ONGServiceImpl implements ONGService {
    private final ONGRepository repository;
    private final CidadaoRepository outroRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public ONGServiceImpl(ONGRepository repository, CidadaoRepository outroRepository) {
        this.repository = repository;
        this.outroRepository = outroRepository;
    }

    @Override
    @Transactional
    public UUID createOng(OngDto request) {
        if (repository.existsByCnpj(request.cnpj()))
            throw new CadastroDuplicadoException("cnpj", "CNPJ já cadastrado");
        if (repository.existsByEmailIgnoreCase(request.email()) || outroRepository.existsByEmailIgnoreCase(request.email()))
            throw new CadastroDuplicadoException("email", "E-mail já cadastrado");
        ONG cadastro = new ONG();
        cadastro.setNome(request.nome());
        cadastro.setCnpj(request.cnpj());
        cadastro.setCep(request.cep());
        cadastro.setEndereco(request.endereco());
        cadastro.setMunicipio(request.municipio());
        cadastro.setEstado(request.estado());
        cadastro.setEmail(request.email());
        cadastro.setSenhaHash(encoder.encode(request.senha()));
        return repository.saveAndFlush(cadastro).getId();
    }

    @Override
    public String getOng(Integer id) { return "ONG -  " + id; }
}
