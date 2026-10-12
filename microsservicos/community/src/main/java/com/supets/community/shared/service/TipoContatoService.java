package com.supets.community.shared.service;

import com.supets.community.shared.dto.ContatoDto;
import com.supets.community.shared.model.TipoContato;

import java.util.List;

public interface TipoContatoService {

    public List<TipoContato> getTipoContatos(List<ContatoDto> contatos);
    public TipoContato getTipoContato(ContatoDto contato);
}
