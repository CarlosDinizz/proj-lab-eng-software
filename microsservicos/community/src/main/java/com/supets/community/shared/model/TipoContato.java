package com.supets.community.shared.model;

import com.supets.community.shared.enums.TipoContatoEnum;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Getter @Setter
@Table(name = "tipo_contato")
@AllArgsConstructor @NoArgsConstructor
public class TipoContato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "tipo")
    @Enumerated(EnumType.STRING)
    private TipoContatoEnum tipo;
}
