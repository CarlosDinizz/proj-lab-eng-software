package com.supets.community.campanha.service;

import com.supets.community.campanha.dto.CampanhaDto;
import com.supets.community.campanha.dto.CampanhaRespostaDto;
import com.supets.community.shared.dto.UsuarioAutenticado;
import com.supets.community.campanha.model.TipoCampanha;
import java.util.List;
import java.util.UUID;

public interface CampanhaService {
    CampanhaRespostaDto criar(UsuarioAutenticado usuario, CampanhaDto dados);
    List<CampanhaRespostaDto> listar(UsuarioAutenticado usuario);
    List<CampanhaRespostaDto> listarMinhas(UsuarioAutenticado usuario);
    List<CampanhaRespostaDto> listarParticipadas(UsuarioAutenticado usuario);
    CampanhaRespostaDto buscar(UUID id, UsuarioAutenticado usuario);
    CampanhaRespostaDto atualizar(UUID id, UsuarioAutenticado usuario, CampanhaDto dados);
    CampanhaRespostaDto participar(UUID id, UsuarioAutenticado usuario);
    List<TipoCampanha> listarTipos();
}