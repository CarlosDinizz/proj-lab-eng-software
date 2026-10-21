package com.supets.ocorrencias.ocorrencia.model;

import com.supets.ocorrencias.ocorrencia.enums.TipoOcorrenciaEnum;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Getter @Setter
@Table(name = "tipo_ocorrencia")
@AllArgsConstructor @NoArgsConstructor
public class TipoOcorrencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "tipo")
    @Enumerated(EnumType.STRING)
    private TipoOcorrenciaEnum tipo;
}
