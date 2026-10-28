package com.supets.ocorrencias.ocorrencia.service.impl;

import com.supets.ocorrencias.ocorrencia.dto.*;
import com.supets.ocorrencias.ocorrencia.exceptions.TipoOcorrenciaNotFoundException;
import com.supets.ocorrencias.ocorrencia.model.*;
import com.supets.ocorrencias.ocorrencia.repository.*;
import com.supets.ocorrencias.ocorrencia.service.OcorrenciaService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class OcorrenciaServiceImpl implements OcorrenciaService {
    private final OcorrenciaRepository repository;
    private final TipoOcorrenciaRepository tipos;

    public OcorrenciaServiceImpl(OcorrenciaRepository repository, TipoOcorrenciaRepository tipos) {
        this.repository = repository;
        this.tipos = tipos;
    }

    @Override
    @Transactional
    public OcorrenciaRespostaDto criar(CriarOcorrenciaDto dados) {
        TipoOcorrencia tipo = tipos.findById(dados.tipoOcorrenciaId())
            .orElseThrow(TipoOcorrenciaNotFoundException::new);
        Ocorrencia o = new Ocorrencia();
        o.setTitulo(dados.titulo());
        o.setDescricao(dados.descricao());
        o.setTipoOcorrencia(tipo);
        o.setCidadaoId(dados.cidadaoId());
        o.setStatus(StatusOcorrencia.ABERTA);
        o.setCreatedAt(Instant.now());
        o.setEndereco(dados.endereco());
        o.setCidade(dados.cidade());
        o.setEstado(dados.estado().toUpperCase(Locale.ROOT));
        o.setEspecie(dados.especie());
        o.setNomeAnimal(dados.nomeAnimal());
        o.setSexo(dados.sexo());
        o.setRaca(dados.raca());
        o.setPorte(dados.porte());
        o.setLat(dados.lat());
        o.setLon(dados.lon());
        return OcorrenciaRespostaDto.de(repository.save(o));
    }

    @Override
    @Transactional(readOnly = true)
    public OcorrenciaRespostaDto buscar(UUID id) {
        return OcorrenciaRespostaDto.de(encontrar(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<OcorrenciaRespostaDto> listar(StatusOcorrencia status) {
        return (status == null ? repository.findAllByOrderByCreatedAtDesc() :
            repository.findByStatusOrderByCreatedAtDesc(status)).stream().map(OcorrenciaRespostaDto::de).toList();
    }

    @Override
    @Transactional
    public OcorrenciaRespostaDto atualizarStatus(UUID id, AtualizarStatusDto dados) {
        Ocorrencia o = repository.findByIdForUpdate(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ocorrência não encontrada."));
        if (o.getStatus() == StatusOcorrencia.ABERTA && dados.status() == StatusOcorrencia.EM_ANDAMENTO && dados.ongId() != null) {
            o.setOngId(dados.ongId());
        } else if (o.getStatus() != StatusOcorrencia.EM_ANDAMENTO || dados.status() != StatusOcorrencia.RESOLVIDA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Transição de status inválida.");
        }
        o.setStatus(dados.status());
        return OcorrenciaRespostaDto.de(repository.save(o));
    }

    @Override
    public List<TipoOcorrencia> listarTipos() {
        return tipos.findAll(org.springframework.data.domain.Sort.by("id"));
    }

    private Ocorrencia encontrar(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ocorrência não encontrada."));
    }
}
