package com.supets.community.shared.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "contato")
@AllArgsConstructor @NoArgsConstructor
@Getter @Setter
public class Contato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "valor", nullable = false)
    private String valor;

    @ManyToOne
    @JoinColumn(name = "tipo_contato_id")
    private TipoContato tipoContato;

    @Column(name = "ong_id")
    private UUID ongId;

    @Column(name = "cidadao_id")
    private UUID cidadaoId;

}
