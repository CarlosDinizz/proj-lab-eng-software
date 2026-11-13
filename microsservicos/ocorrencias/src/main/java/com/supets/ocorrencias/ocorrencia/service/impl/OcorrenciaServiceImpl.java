package com.supets.ocorrencias.ocorrencia.service.impl;

import com.supets.ocorrencias.ocorrencia.dto.*;
import com.supets.ocorrencias.ocorrencia.exceptions.OpcaoInvalidaException;
import com.supets.ocorrencias.ocorrencia.exceptions.TipoOcorrenciaNotFoundException;
import com.supets.ocorrencias.ocorrencia.model.*;
import com.supets.ocorrencias.ocorrencia.repository.*;
import com.supets.ocorrencias.ocorrencia.service.Distancia;
import com.supets.ocorrencias.ocorrencia.service.OcorrenciaService;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class OcorrenciaServiceImpl implements OcorrenciaService {
    private static final double RAIO_PADRAO_KM = 10;
    private static final double RAIO_MAXIMO_KM = 500;
    private static final double KM_POR_GRAU = 111.32;

    private final OcorrenciaRepository repository;
    private final TipoOcorrenciaRepository tipos;
    private final EspecieRepository especies;
    private final PorteRepository portes;
    private final SexoAnimalRepository sexos;

    public OcorrenciaServiceImpl(OcorrenciaRepository repository, TipoOcorrenciaRepository tipos,
            EspecieRepository especies, PorteRepository portes, SexoAnimalRepository sexos) {
        this.repository = repository;
        this.tipos = tipos;
        this.especies = especies;
        this.portes = portes;
        this.sexos = sexos;
    }

    @Override
    @Transactional
    public OcorrenciaRespostaDto criar(UsuarioAutenticado autor, CriarOcorrenciaDto dados) {
        TipoOcorrencia tipo = tipos.findById(dados.tipoOcorrenciaId())
            .orElseThrow(TipoOcorrenciaNotFoundException::new);

        Ocorrencia o = new Ocorrencia();
        o.setTitulo(dados.titulo().trim());
        o.setDescricao(dados.descricao().trim());
        o.setDataOcorrido(dados.dataOcorrido());
        o.setTipoOcorrencia(tipo);
        o.setCidadaoId(autor.id());
        o.setStatus(StatusOcorrencia.ABERTA);
        o.setCreatedAt(Instant.now());
        o.setCep(dados.cep().replace("-", ""));
        o.setEndereco(dados.endereco().trim());
        o.setCidade(dados.cidade().trim());
        o.setEstado(dados.estado().toUpperCase(Locale.ROOT));
        o.setLat(dados.lat());
        o.setLon(dados.lon());
        o.setAnimal(montarAnimal(dados.animal()));
        return OcorrenciaRespostaDto.de(repository.save(o));
    }

    private Animal montarAnimal(CriarAnimalDto dados) {
        Animal animal = new Animal();
        animal.setNome(vazioViraNulo(dados.nome()));
        animal.setRaca(vazioViraNulo(dados.raca()));
        animal.setEspecie(especies.findById(dados.especieId())
            .orElseThrow(() -> new OpcaoInvalidaException("animal.especieId", "Espécie não encontrada.")));
        if (dados.sexoId() != null) {
            animal.setSexo(sexos.findById(dados.sexoId())
                .orElseThrow(() -> new OpcaoInvalidaException("animal.sexoId", "Sexo não encontrado.")));
        }
        if (dados.porteId() != null) {
            animal.setPorte(portes.findById(dados.porteId())
                .orElseThrow(() -> new OpcaoInvalidaException("animal.porteId", "Porte não encontrado.")));
        }
        return animal;
    }

    private static String vazioViraNulo(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }

    @Override
    @Transactional(readOnly = true)
    public OcorrenciaRespostaDto buscar(UUID id) {
        return OcorrenciaRespostaDto.de(encontrar(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<OcorrenciaRespostaDto> listar(StatusOcorrencia status, Double lat, Double lon, Double raioKm) {
        if (lat == null && lon == null) {
            return (status == null ? repository.findAllByOrderByCreatedAtDesc() :
                repository.findByStatusOrderByCreatedAtDesc(status)).stream().map(OcorrenciaRespostaDto::de).toList();
        }
        if (lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe lat e lon válidos, juntos.");
        }
        double raio = raioKm == null ? RAIO_PADRAO_KM : raioKm;
        if (raio <= 0 || raio > RAIO_MAXIMO_KM) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O raio deve ficar entre 0 e 500 km.");
        }

        // 1) O banco devolve só o "quadrado" em volta do ponto, para não carregar tudo.
        double grausLat = raio / KM_POR_GRAU;
        double grausLon = raio / (KM_POR_GRAU * Math.max(Math.cos(Math.toRadians(lat)), 0.01));
        // 2) Aqui fica só quem está dentro do círculo, da mais próxima para a mais longe.
        return repository.findByLatBetweenAndLonBetween(lat - grausLat, lat + grausLat, lon - grausLon, lon + grausLon)
            .stream()
            .filter(o -> status == null || o.getStatus() == status)
            .filter(o -> Distancia.km(lat, lon, o.getLat(), o.getLon()) <= raio)
            .sorted(Comparator.comparingDouble(o -> Distancia.km(lat, lon, o.getLat(), o.getLon())))
            .map(OcorrenciaRespostaDto::de)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OcorrenciaRespostaDto> listarMinhas(UsuarioAutenticado usuario) {
        return repository.findByCidadaoIdOrResponsavelIdOrderByCreatedAtDesc(usuario.id(), usuario.id())
            .stream().map(OcorrenciaRespostaDto::de).toList();
    }

    /**
     * Regras de status, conforme a documentação:
     * <ul>
     *   <li>ABERTA → EM_ANDAMENTO: qualquer cidadão ou ONG logado pode assumir e cooperar (RF2).</li>
     *   <li>EM_ANDAMENTO → RESOLVIDA: quem assumiu ou quem registrou conclui (UC002).</li>
     *   <li>ABERTA → RESOLVIDA: só quem registrou (por exemplo, o próprio dono achou o animal).</li>
     * </ul>
     */
    @Override
    @Transactional
    public OcorrenciaRespostaDto atualizarStatus(UUID id, UsuarioAutenticado usuario, AtualizarStatusDto dados) {
        Ocorrencia o = repository.findByIdForUpdate(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ocorrência não encontrada."));
        StatusOcorrencia de = o.getStatus();
        StatusOcorrencia para = dados.status();
        boolean ehAutor = usuario.id().equals(o.getCidadaoId());
        boolean ehResponsavel = usuario.id().equals(o.getResponsavelId());

        if (de == StatusOcorrencia.ABERTA && para == StatusOcorrencia.EM_ANDAMENTO) {
            o.setResponsavelId(usuario.id());
            o.setResponsavelPerfil(usuario.perfil());
        } else if (de == StatusOcorrencia.EM_ANDAMENTO && para == StatusOcorrencia.RESOLVIDA) {
            if (!ehResponsavel && !ehAutor) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Apenas quem assumiu ou quem registrou a ocorrência pode resolvê-la.");
            }
        } else if (de == StatusOcorrencia.ABERTA && para == StatusOcorrencia.RESOLVIDA) {
            if (!ehAutor) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Assuma a ocorrência antes de resolvê-la.");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Transição de status inválida.");
        }
        o.setStatus(para);
        return OcorrenciaRespostaDto.de(repository.save(o));
    }

    @Override
    public List<TipoOcorrencia> listarTipos() {
        return tipos.findAll(Sort.by("id"));
    }

    @Override
    public List<Especie> listarEspecies() {
        return especies.findAll(Sort.by("id"));
    }

    @Override
    public List<Porte> listarPortes() {
        return portes.findAll(Sort.by("id"));
    }

    @Override
    public List<SexoAnimal> listarSexos() {
        return sexos.findAll(Sort.by("id"));
    }

    private Ocorrencia encontrar(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ocorrência não encontrada."));
    }
}
