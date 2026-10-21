package com.supets.ocorrencias.ocorrencia.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "ocorrencia")
@AllArgsConstructor @NoArgsConstructor
@Getter @Setter
public class Ocorrencia{

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "descricao", nullable = false)
    private String descricao;

    @Column(name = "lat", nullable = false)
    private double lat;

    @Column(name = "lon", nullable = false)
    private double lat;

    @Column(name = "cidadao_id", nullable = false)
    private Integer cidadao_id;

    @ManyToOne
    @JoinColumn(name = "tipo_ocorrencia_id")
    private TipoContato tipoContato;
}
