package com.supets.community.ong.model;

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

@Table(name = "ong")
@AllArgsConstructor @NoArgsConstructor
@Getter @Setter
@Entity
public class ONG {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "nome", nullable = false)
    private String nome;

    @Column(name = "descricao")
    private String descricao;

    @Column(name = "cnpj", nullable = false)
    private String cnpj;

    private String cep;
    private String endereco;
    private String municipio;
    private String estado;
    private String email;

    @Column(name = "senha_hash")
    private String senhaHash;

    @OneToMany
    @JoinColumn(name = "ong_id")
    private List<Contato> contatos = new ArrayList<>();

    @OneToOne
    @JoinColumn(name = "local_id")
    private Local local;

}
