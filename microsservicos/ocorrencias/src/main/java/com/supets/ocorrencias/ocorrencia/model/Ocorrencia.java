package com.supets.ocorrencias.ocorrencia.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
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
    @ManyToOne(optional = false)
    @JoinColumn(name = "tipo_ocorrencia_id", nullable = false)
    private TipoOcorrencia tipoOcorrencia;
    @Column(nullable = false) private UUID cidadaoId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20) private StatusOcorrencia status;
    private UUID ongId;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private String endereco;
    @Column(nullable = false) private String cidade;
    @Column(nullable = false, length = 2) private String estado;
    @Column(nullable = false) private String especie;
    private String nomeAnimal;
    private String sexo;
    private String raca;
    private String porte;
    private Double lat;
    private Double lon;
}
