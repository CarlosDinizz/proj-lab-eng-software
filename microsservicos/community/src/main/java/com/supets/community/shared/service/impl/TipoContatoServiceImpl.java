package com.supets.community.shared.service.impl;

import com.supets.community.shared.dto.ContatoDto;
import com.supets.community.shared.exceptions.TipoContatoNotFoundException;
import com.supets.community.shared.model.TipoContato;
import com.supets.community.shared.repository.TipoContatoRepository;
import com.supets.community.shared.service.TipoContatoService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TipoContatoServiceImpl implements TipoContatoService {

    private final TipoContatoRepository repository;

    public TipoContatoServiceImpl(TipoContatoRepository repository) {
        this.repository = repository;
    }

    public List<TipoContato> getTipoContatos(List<ContatoDto> contatos) {
        return contatos.stream().map(this::getTipoContato).toList();
    }

    public TipoContato getTipoContato(ContatoDto contato) {
        return repository.findByTipo(contato.tipo()).orElseThrow(TipoContatoNotFoundException::new);
    }
}
