package com.supets.community.cidadao.model;

import com.supets.community.shared.model.Contato;
import com.supets.community.shared.model.Local;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "cidadao")
@AllArgsConstructor @NoArgsConstructor
@Getter @Setter
public class Cidadao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "nome", nullable = false)
    private String nome;

    @Column(name = "cpf", nullable = false)
    private String cpf;

    @OneToMany
    @JoinColumn(name = "cidadao_id")
    private List<Contato> contatos = new ArrayList<>();

    @OneToOne
    @JoinColumn(name = "local_id")
    private Local local;
}
