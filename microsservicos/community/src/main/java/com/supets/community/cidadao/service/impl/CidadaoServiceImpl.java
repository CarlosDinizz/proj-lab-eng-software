package com.supets.community.cidadao.service.impl;

import com.supets.community.cidadao.dto.CidadaoDto;
import com.supets.community.cidadao.model.Cidadao;
import com.supets.community.cidadao.repository.CidadaoRepository;
import com.supets.community.cidadao.service.CidadaoService;
import com.supets.community.ong.repository.ONGRepository;
import com.supets.community.shared.exceptions.CadastroDuplicadoException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class CidadaoServiceImpl implements CidadaoService {
    private final CidadaoRepository repository;
    private final ONGRepository outroRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public CidadaoServiceImpl(CidadaoRepository repository, ONGRepository outroRepository) {
        this.repository = repository;
        this.outroRepository = outroRepository;
    }

    @Override
    @Transactional
    public UUID createCidadao(CidadaoDto request) {
        if (repository.existsByCpf(request.cpf()))
            throw new CadastroDuplicadoException("cpf", "CPF já cadastrado");
        if (repository.existsByEmailIgnoreCase(request.email()) || outroRepository.existsByEmailIgnoreCase(request.email()))
            throw new CadastroDuplicadoException("email", "E-mail já cadastrado");
        Cidadao cadastro = new Cidadao();
        cadastro.setNome(request.nome());
        cadastro.setCpf(request.cpf());
        cadastro.setCep(request.cep());
        cadastro.setEndereco(request.endereco());
        cadastro.setMunicipio(request.municipio());
        cadastro.setEstado(request.estado());
        cadastro.setEmail(request.email());
        cadastro.setSenhaHash(encoder.encode(request.senha()));
        return repository.saveAndFlush(cadastro).getId();
    }

    @Override
    public String getCidadao(Integer id) { return "Cidadão -  " + id; }
}
