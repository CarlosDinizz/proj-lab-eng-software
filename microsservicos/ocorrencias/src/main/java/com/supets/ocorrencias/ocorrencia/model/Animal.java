package com.supets.ocorrencias.ocorrencia.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

/** O animal envolvido na ocorrência (diagrama de classes: Ocorrencia "1" --> "1" Animal). */
@Entity
@Table(name = "animal")
@Getter @Setter
public class Animal {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String nome;
    private String raca;

    @ManyToOne(optional = false)
    @JoinColumn(name = "especie_id", nullable = false)
    private Especie especie;

    @ManyToOne
    @JoinColumn(name = "sexo_id")
    private SexoAnimal sexo;

    @ManyToOne
    @JoinColumn(name = "porte_id")
    private Porte porte;
}
