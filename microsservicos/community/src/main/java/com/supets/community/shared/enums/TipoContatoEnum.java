package com.supets.community.shared.enums;

public enum TipoContatoEnum {
    TELEFONE(1, "Telefone"),
    CELULAR(2, "Celular"),
    EMAIL(3, "E-mail");

    private Integer numero;
    private String titulo;

    private TipoContatoEnum(Integer num, String titulo){
        this.numero = num;
        this.titulo = titulo;
    }
}
