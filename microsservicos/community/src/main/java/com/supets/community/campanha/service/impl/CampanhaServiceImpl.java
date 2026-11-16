package com.supets.community.campanha.service.impl;

import com.supets.community.campanha.dto.CampanhaDto;
import com.supets.community.campanha.dto.CampanhaRespostaDto;
import com.supets.community.campanha.dto.UsuarioAutenticado;
import com.supets.community.campanha.exceptions.CampanhaException;
import com.supets.community.campanha.model.Campanha;
import com.supets.community.campanha.model.ParticipacaoCampanha;
import com.supets.community.campanha.model.TipoCampanha;
import com.supets.community.campanha.repository.CampanhaRepository;
import com.supets.community.campanha.repository.ParticipacaoCampanhaRepository;
import com.supets.community.campanha.repository.TipoCampanhaRepository;
import com.supets.community.campanha.service.CampanhaService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CampanhaServiceImpl implements CampanhaService {
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private final CampanhaRepository repository;
    private final TipoCampanhaRepository tipos;
    private final ParticipacaoCampanhaRepository participacoes;

    public CampanhaServiceImpl(CampanhaRepository repository, TipoCampanhaRepository tipos,
            ParticipacaoCampanhaRepository participacoes) {
        this.repository = repository;
        this.tipos = tipos;
        this.participacoes = participacoes;
    }

    @Override
    @Transactional
    public CampanhaRespostaDto criar(UsuarioAutenticado usuario, CampanhaDto dados) {
        if (!usuario.ehOng()) throw new CampanhaException(HttpStatus.FORBIDDEN, "Apenas ONGs podem criar campanhas.");
        LocalDate hoje = hoje();
        if (dados.dataInicio().isBefore(hoje)) {
            throw new CampanhaException(HttpStatus.BAD_REQUEST, "dataInicio", "A campanha não pode começar no passado.");
        }
        validarPeriodo(dados);

        Campanha c = new Campanha();
        c.setOngId(usuario.id());
        c.setCreatedAt(Instant.now());
        preencher(c, dados);
        return CampanhaRespostaDto.de(repository.saveAndFlush(c), false, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampanhaRespostaDto> listar(UsuarioAutenticado usuario) {
        LocalDate hoje = hoje();
        Comparator<Campanha> ordem = Comparator
            .comparing((Campanha c) -> c.getDataFim().isBefore(hoje))
            .thenComparingLong(c -> c.getDataFim().isBefore(hoje) ? hoje.toEpochDay() - c.getDataFim().toEpochDay()
                : c.getDataInicio().toEpochDay());
        List<Campanha> campanhas = repository.findAll().stream().sorted(ordem).toList();
        return responder(campanhas, usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampanhaRespostaDto> listarMinhas(UsuarioAutenticado usuario) {
        if (!usuario.ehOng()) throw new CampanhaException(HttpStatus.FORBIDDEN, "Apenas ONGs têm campanhas próprias.");
        List<Campanha> campanhas = repository.findByOngId(usuario.id()).stream()
            .sorted(Comparator.comparing(Campanha::getDataInicio).reversed())
            .toList();
        return responder(campanhas, usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampanhaRespostaDto> listarParticipadas(UsuarioAutenticado usuario) {
        if (!usuario.ehCidadao()) throw new CampanhaException(HttpStatus.FORBIDDEN, "Apenas cidadãos participam de campanhas.");
        List<UUID> ids = participacoes.findCampanhaIdsByCidadaoId(usuario.id());
        if (ids.isEmpty()) return List.of();
        List<Campanha> campanhas = repository.findAllById(ids).stream()
            .sorted(Comparator.comparing(Campanha::getDataInicio).reversed())
            .toList();
        return responder(campanhas, usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public CampanhaRespostaDto buscar(UUID id, UsuarioAutenticado usuario) {
        return responder(encontrar(id), usuario);
    }

    @Override
    @Transactional
    public CampanhaRespostaDto atualizar(UUID id, UsuarioAutenticado usuario, CampanhaDto dados) {
        Campanha c = encontrar(id);
        if (!usuario.ehOng() || !usuario.id().equals(c.getOngId())) {
            throw new CampanhaException(HttpStatus.FORBIDDEN, "Apenas a ONG que criou a campanha pode atualizá-la.");
        }
        if (!dados.dataInicio().equals(c.getDataInicio()) && dados.dataInicio().isBefore(hoje())) {
            throw new CampanhaException(HttpStatus.BAD_REQUEST, "dataInicio", "A campanha não pode começar no passado.");
        }
        validarPeriodo(dados);
        preencher(c, dados);
        return responder(repository.saveAndFlush(c), usuario);
    }

    @Override
    @Transactional
    public CampanhaRespostaDto participar(UUID id, UsuarioAutenticado usuario) {
        if (!usuario.ehCidadao()) throw new CampanhaException(HttpStatus.FORBIDDEN, "Apenas cidadãos podem participar de campanhas.");
        Campanha c = encontrar(id);
        if (c.getDataFim().isBefore(hoje())) {
            throw new CampanhaException(HttpStatus.CONFLICT, "Esta campanha já terminou.");
        }
        if (participacoes.existsByCampanhaIdAndCidadaoId(id, usuario.id())) {
            throw new CampanhaException(HttpStatus.CONFLICT, "Você já participa desta campanha.");
        }
        participacoes.saveAndFlush(new ParticipacaoCampanha(id, usuario.id(), Instant.now()));
        return responder(c, usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TipoCampanha> listarTipos() {
        return tipos.findAll(Sort.by("id"));
    }

    private Campanha encontrar(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new CampanhaException(HttpStatus.NOT_FOUND, "Campanha não encontrada."));
    }

    private static void validarPeriodo(CampanhaDto dados) {
        if (dados.dataFim().isBefore(dados.dataInicio())) {
            throw new CampanhaException(HttpStatus.BAD_REQUEST, "dataFim", "A data de fim deve ser igual ou depois da data de início.");
        }
    }

    private void preencher(Campanha c, CampanhaDto dados) {
        TipoCampanha tipo = tipos.findById(dados.tipoCampanhaId())
            .orElseThrow(() -> new CampanhaException(HttpStatus.BAD_REQUEST, "tipoCampanhaId", "Tipo de campanha não encontrado."));
        c.setTitulo(dados.titulo());
        c.setDescricao(dados.descricao());
        c.setDataInicio(dados.dataInicio());
        c.setDataFim(dados.dataFim());
        c.setTipoCampanha(tipo);
        c.setCep(dados.cep());
        c.setEndereco(dados.endereco());
        c.setCidade(dados.cidade());
        c.setEstado(dados.estado());
    }

    private CampanhaRespostaDto responder(Campanha c, UsuarioAutenticado usuario) {
        boolean participando = usuario.ehCidadao() && participacoes.existsByCampanhaIdAndCidadaoId(c.getId(), usuario.id());
        return CampanhaRespostaDto.de(c, participando, participacoes.countByCampanhaId(c.getId()));
    }

    private List<CampanhaRespostaDto> responder(List<Campanha> campanhas, UsuarioAutenticado usuario) {
        if (campanhas.isEmpty()) return List.of();
        Set<UUID> minhas = usuario.ehCidadao()
            ? new HashSet<>(participacoes.findCampanhaIdsByCidadaoId(usuario.id()))
            : Set.of();
        Map<UUID, Long> totais = new HashMap<>();
        for (Object[] linha : participacoes.contarPorCampanha(campanhas.stream().map(Campanha::getId).toList())) {
            totais.put((UUID) linha[0], ((Number) linha[1]).longValue());
        }
        return campanhas.stream()
            .map(c -> CampanhaRespostaDto.de(c, minhas.contains(c.getId()), totais.getOrDefault(c.getId(), 0L)))
            .toList();
    }

    private static LocalDate hoje() {
        return LocalDate.now(FUSO);
    }
}