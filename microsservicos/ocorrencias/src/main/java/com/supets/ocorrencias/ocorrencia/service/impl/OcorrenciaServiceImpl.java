package com.supets.ocorrencias.ocorrencia.service.impl;

import com.supets.ocorrencias.ocorrencia.dto.*;
import com.supets.ocorrencias.ocorrencia.exceptions.OpcaoInvalidaException;
import com.supets.ocorrencias.ocorrencia.exceptions.TipoOcorrenciaNotFoundException;
import com.supets.ocorrencias.ocorrencia.model.*;
import com.supets.ocorrencias.ocorrencia.repository.*;
import com.supets.ocorrencias.ocorrencia.service.Distancia;
import com.supets.ocorrencias.ocorrencia.service.OcorrenciaService;
import com.supets.ocorrencias.ocorrencia.enums.PerfilEnum;
import com.supets.ocorrencias.ocorrencia.validation.Enderecos;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class OcorrenciaServiceImpl implements OcorrenciaService {
    private static final double RAIO_PADRAO_KM = 10;
    private static final double RAIO_MAXIMO_KM = 500;

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
    public OcorrenciaRespostaDto criar(UsuarioAutenticado autor, DadosOcorrenciaDto dados) {
        exigirCidadao(autor);
        Ocorrencia o = new Ocorrencia();
        o.setCidadaoId(autor.id());
        o.setStatus(StatusOcorrencia.ABERTA);
        o.setCreatedAt(Instant.now().truncatedTo(ChronoUnit.MICROS));
        o.setAnimal(new Animal());
        preencher(o, dados);
        return OcorrenciaRespostaDto.de(repository.save(o));
    }

    @Override
    @Transactional
    public OcorrenciaRespostaDto atualizar(UUID id, UsuarioAutenticado usuario, DadosOcorrenciaDto dados) {
        exigirCidadao(usuario);
        Ocorrencia o = encontrarParaAtualizar(id);
        if (!usuario.id().equals(o.getCidadaoId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas quem registrou pode editar a ocorrência.");
        }
        if (o.getStatus() != StatusOcorrencia.ABERTA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta ocorrência não pode mais ser editada.");
        }
        preencher(o, dados);
        return OcorrenciaRespostaDto.de(repository.save(o));
    }

    private static void exigirCidadao(UsuarioAutenticado usuario) {
        if (usuario == null || usuario.id() == null || usuario.perfil() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Faça login para continuar.");
        }
        if (usuario.perfil() != PerfilEnum.CIDADAO) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas cidadãos podem registrar ou editar ocorrências.");
        }
    }

    private void preencher(Ocorrencia o, DadosOcorrenciaDto dados) {
        validarCoordenadas(dados.lat(), dados.lon());
        String uf = Enderecos.normalizarUf(dados.estado());
        String cidade = Enderecos.cidadeCanonica(uf, dados.cidade(), "cidade");
        TipoOcorrencia tipo = tipos.findById(dados.tipoOcorrenciaId())
            .orElseThrow(TipoOcorrenciaNotFoundException::new);
        CriarAnimalDto dadosAnimal = dados.animal();
        Especie especie = especies.findById(dadosAnimal.especieId())
            .orElseThrow(() -> new OpcaoInvalidaException("animal.especieId", "Espécie não encontrada."));
        SexoAnimal sexo = dadosAnimal.sexoId() == null ? null : sexos.findById(dadosAnimal.sexoId())
            .orElseThrow(() -> new OpcaoInvalidaException("animal.sexoId", "Sexo não encontrado."));
        Porte porte = dadosAnimal.porteId() == null ? null : portes.findById(dadosAnimal.porteId())
            .orElseThrow(() -> new OpcaoInvalidaException("animal.porteId", "Porte não encontrado."));
        o.setTitulo(dados.titulo().trim());
        o.setDescricao(dados.descricao().trim());
        o.setDataOcorrido(dados.dataOcorrido());
        o.setTipoOcorrencia(tipo);
        o.setCep(dados.cep().replace("-", ""));
        o.setEndereco(dados.endereco().trim());
        o.setCidade(cidade);
        o.setEstado(uf);
        o.setLat(dados.lat());
        o.setLon(dados.lon());
        Animal animal = o.getAnimal();
        animal.setNome(vazioViraNulo(dadosAnimal.nome()));
        animal.setRaca(vazioViraNulo(dadosAnimal.raca()));
        animal.setEspecie(especie);
        animal.setSexo(sexo);
        animal.setPorte(porte);
    }

    private static void validarCoordenadas(Double lat, Double lon) {
        if (lat == null || lon == null || !Double.isFinite(lat) || !Double.isFinite(lon)
                || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe lat e lon válidos, juntos.");
        }
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
        if (lat == null && lon == null && raioKm == null) {
            return (status == null ? repository.findAllByOrderByCreatedAtDesc() :
                repository.findByStatusOrderByCreatedAtDesc(status)).stream().map(OcorrenciaRespostaDto::de).toList();
        }
        validarCoordenadas(lat, lon);
        double raio = raioKm == null ? RAIO_PADRAO_KM : raioKm;
        if (!Double.isFinite(raio) || raio <= 0 || raio > RAIO_MAXIMO_KM) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O raio deve ficar entre 0 e 500 km.");
        }
        double delta = raio / Distancia.RAIO_TERRA_KM;
        double latitude = Math.toRadians(lat);
        double sul = Math.max(-Math.PI / 2, latitude - delta);
        double norte = Math.min(Math.PI / 2, latitude + delta);
        boolean todosLongitudes = sul <= -Math.PI / 2 || norte >= Math.PI / 2;
        double largura = todosLongitudes ? 180 :
            Math.toDegrees(Math.asin(Math.clamp(Math.sin(delta) / Math.cos(latitude), -1, 1)));
        double oeste = normalizarLongitude(lon - largura);
        double leste = normalizarLongitude(lon + largura);
        return repository.buscarNaRegiao(status, Math.nextDown(Math.toDegrees(sul)),
                Math.nextUp(Math.toDegrees(norte)), todosLongitudes, oeste > leste,
                Math.nextDown(oeste), Math.nextUp(leste)).stream()
            .map(o -> new OcorrenciaDistante(o, Distancia.km(lat, lon, o.getLat(), o.getLon())))
            .filter(o -> o.km() <= raio)
            .sorted(Comparator.comparingDouble(OcorrenciaDistante::km))
            .map(o -> OcorrenciaRespostaDto.de(o.ocorrencia()))
            .toList();
    }

    private record OcorrenciaDistante(Ocorrencia ocorrencia, double km) {}

    private static double normalizarLongitude(double longitude) {
        if (longitude < -180) return longitude + 360;
        if (longitude >= 180) return longitude - 360;
        return longitude;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OcorrenciaRespostaDto> listarMinhas(UsuarioAutenticado usuario) {
        return repository.buscarMinhas(usuario.id(), usuario.perfil())
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
        Ocorrencia o = encontrarParaAtualizar(id);
        StatusOcorrencia de = o.getStatus();
        StatusOcorrencia para = dados.status();
        boolean ehAutor = usuario.perfil() == PerfilEnum.CIDADAO && usuario.id().equals(o.getCidadaoId());
        boolean ehResponsavel = usuario.id().equals(o.getResponsavelId())
            && usuario.perfil() == o.getResponsavelPerfil();

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
    private Ocorrencia encontrarParaAtualizar(UUID id) {
        return repository.findByIdForUpdate(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ocorrência não encontrada."));
    }


    private Ocorrencia encontrar(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ocorrência não encontrada."));
    }
}
