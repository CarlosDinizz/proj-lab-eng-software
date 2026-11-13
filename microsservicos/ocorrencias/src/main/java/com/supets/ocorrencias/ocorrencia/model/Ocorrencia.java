package com.supets.ocorrencias.ocorrencia.model;

import com.supets.ocorrencias.ocorrencia.enums.PerfilEnum;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "ocorrencia")
@Getter @Setter
public class Ocorrencia {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false) private String titulo;
    @Column(nullable = false, columnDefinition = "TEXT") private String descricao;
    @Column(nullable = false) private LocalDate dataOcorrido;
    @ManyToOne(optional = false)
    @JoinColumn(name = "tipo_ocorrencia_id", nullable = false)
    private TipoOcorrencia tipoOcorrencia;
    @Column(nullable = false) private UUID cidadaoId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20) private StatusOcorrencia status;
    /** Quem assumiu a ocorrência: um cidadão ou uma ONG. */
    private UUID responsavelId;
    @Enumerated(EnumType.STRING)
    @Column(length = 10) private PerfilEnum responsavelPerfil;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false, length = 8) private String cep;
    @Column(nullable = false) private String endereco;
    @Column(nullable = false) private String cidade;
    @Column(nullable = false, length = 2) private String estado;
    @Column(nullable = false) private Double lat;
    @Column(nullable = false) private Double lon;
    @OneToOne(cascade = CascadeType.ALL, optional = false, orphanRemoval = true)
    @JoinColumn(name = "animal_id", nullable = false, unique = true)
    private Animal animal;
}
