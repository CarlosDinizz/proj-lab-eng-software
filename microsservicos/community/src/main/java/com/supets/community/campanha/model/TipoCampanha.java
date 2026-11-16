package com.supets.community.campanha.model;

import jakarta.persistence.*;

@Entity
@Table(name = "tipo_campanha")
public class TipoCampanha {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String nome;

    public Integer getId() { return id; }
    public String getNome() { return nome; }
}