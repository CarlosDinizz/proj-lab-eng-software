package com.supets.ocorrencias.ocorrencia.service;

import com.supets.ocorrencias.ocorrencia.dto.*;
import com.supets.ocorrencias.ocorrencia.model.StatusOcorrencia;
import com.supets.ocorrencias.ocorrencia.model.TipoOcorrencia;
import java.util.List;
import java.util.UUID;

public interface OcorrenciaService {
    OcorrenciaRespostaDto criar(CriarOcorrenciaDto dados);
    OcorrenciaRespostaDto buscar(UUID id);
    List<OcorrenciaRespostaDto> listar(StatusOcorrencia status);
    OcorrenciaRespostaDto atualizarStatus(UUID id, AtualizarStatusDto dados);
    List<TipoOcorrencia> listarTipos();
}
