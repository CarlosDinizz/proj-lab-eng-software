package com.supets.community.ong.dto;

import com.supets.community.shared.dto.ContatoDto;
import com.supets.community.shared.dto.LocalDto;

import java.util.List;

public record OngDto(
    String nome,
    String descricao,
    String cnpj,
    LocalDto local,
    List<ContatoDto> contatos
) {
}
