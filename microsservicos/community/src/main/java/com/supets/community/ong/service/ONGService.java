package com.supets.community.ong.service;


import com.supets.community.ong.dto.OngDto;

public interface ONGService {

    void createOng(OngDto request);

    String getOng(Integer id);
}
