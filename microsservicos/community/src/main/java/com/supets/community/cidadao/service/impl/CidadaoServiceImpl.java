package com.supets.community.cidadao.service.impl;

import com.supets.community.cidadao.dto.CidadaoDto;
import com.supets.community.cidadao.model.Cidadao;
import com.supets.community.cidadao.repository.CidadaoRepository;
import com.supets.community.cidadao.service.CidadaoService;
import com.supets.community.ong.repository.ONGRepository;
import com.supets.community.shared.dto.CredencialDto;
import com.supets.community.shared.enums.PerfilEnum;
import com.supets.community.shared.exceptions.CadastroDuplicadoException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import com.supets.community.shared.dto.PerfilRespostaDto;
import com.supets.community.shared.exceptions.ApiException;
import com.supets.community.shared.service.ReservaEmailService;
import com.supets.community.shared.validation.Enderecos;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Isolation;
import java.util.UUID;

@Service
public class CidadaoServiceImpl implements CidadaoService {
    private final CidadaoRepository repository;
    private final ONGRepository outroRepository;
    private final ReservaEmailService reservaEmail;
    private final Enderecos enderecos;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public CidadaoServiceImpl(CidadaoRepository repository, ONGRepository outroRepository,
            ReservaEmailService reservaEmail, Enderecos enderecos) {
        this.repository = repository;
        this.outroRepository = outroRepository;
        this.reservaEmail = reservaEmail;
        this.enderecos = enderecos;
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public UUID createCidadao(CidadaoDto request) {
        reservaEmail.bloquear(request.email());
        if (repository.existsByCpf(request.cpf()))
            throw new CadastroDuplicadoException("cpf", "CPF já cadastrado");
        if (repository.existsByEmailIgnoreCase(request.email()) || outroRepository.existsByEmailIgnoreCase(request.email()))
            throw new CadastroDuplicadoException("email", "E-mail já cadastrado");
        Cidadao cadastro = new Cidadao();
        cadastro.setNome(request.nome());
        cadastro.setCpf(request.cpf());
        cadastro.setCep(request.cep());
        cadastro.setEndereco(request.endereco());
        cadastro.setMunicipio(enderecos.cidadeCanonica(request.estado(), request.municipio(), "municipio"));
        cadastro.setEstado(enderecos.normalizarUf(request.estado()));
        cadastro.setEmail(request.email());
        cadastro.setSenhaHash(encoder.encode(request.senha()));
        return repository.saveAndFlush(cadastro).getId();
    }

    @Override
    public PerfilRespostaDto getCidadao(UUID id) {
        return repository.findPerfilById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cidadão não encontrado."));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CredencialDto> buscarCredenciais(String email) {
        return repository.findByEmailIgnoreCase(email).stream()
            .map(c -> new CredencialDto(c.getId(), c.getNome(), c.getSenhaHash(), PerfilEnum.CIDADAO)).toList();
    }
}
