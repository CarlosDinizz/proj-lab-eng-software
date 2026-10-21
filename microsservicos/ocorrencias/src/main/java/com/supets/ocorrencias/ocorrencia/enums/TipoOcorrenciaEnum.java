package com.supets.community.shared.enums;

public enum TipoOcorrenciaEnum{
    ABANDONADO(1, "Animal Abandonado"),
    APUROS(2, "Animal em Apuros"),
    MEDICO(3, "Animal em Necessidade de Assitência Médica");

    private Integer numero;
    private String titulo;

    private TipoOcorrenciaEnum(Integer num, String titulo){
        this.numero = num;
        this.titulo = titulo;
    }
}
