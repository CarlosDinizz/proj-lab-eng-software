package com.supets.ocorrencias.ocorrencia.service;

import com.supets.ocorrencias.ocorrencia.dto.*;
import com.supets.ocorrencias.ocorrencia.model.*;
import java.util.List;
import java.util.UUID;

public interface OcorrenciaService {
    OcorrenciaRespostaDto criar(UsuarioAutenticado autor, CriarOcorrenciaDto dados);
    OcorrenciaRespostaDto buscar(UUID id);
    /** Com lat e lon, devolve só as ocorrências até raioKm do ponto, da mais próxima para a mais longe. */
    List<OcorrenciaRespostaDto> listar(StatusOcorrencia status, Double lat, Double lon, Double raioKm);
    /** As que o usuário registrou ou assumiu. */
    List<OcorrenciaRespostaDto> listarMinhas(UsuarioAutenticado usuario);
    OcorrenciaRespostaDto atualizarStatus(UUID id, UsuarioAutenticado usuario, AtualizarStatusDto dados);
    List<TipoOcorrencia> listarTipos();
    List<Especie> listarEspecies();
    List<Porte> listarPortes();
    List<SexoAnimal> listarSexos();
}
