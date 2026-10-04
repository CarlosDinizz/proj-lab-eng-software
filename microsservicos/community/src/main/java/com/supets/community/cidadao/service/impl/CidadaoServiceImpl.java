package com.supets.community.cidadao.service.impl;


import com.supets.community.cidadao.service.CidadaoService;
import org.springframework.stereotype.Service;

@Service
public class CidadaoServiceImpl implements CidadaoService {

    @Override
    public void createCidadao() {
        System.out.println("Cidadão criado.");
    }

    @Override
    public String getCidadao(Integer id) {
        return "Cidadão -  " + id;
    }
}
