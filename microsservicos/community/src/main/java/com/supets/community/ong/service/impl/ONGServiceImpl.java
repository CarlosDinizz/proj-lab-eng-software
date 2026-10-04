package com.supets.community.ong.service.impl;

import com.supets.community.ong.service.ONGService;
import org.springframework.stereotype.Service;

@Service
public class ONGServiceImpl implements ONGService {

    @Override
    public void createOng() {
        System.out.println("ONG criada!");
    }

    @Override
    public String getOng(Integer id) {
        return "ONG - " + id;
    }
}
