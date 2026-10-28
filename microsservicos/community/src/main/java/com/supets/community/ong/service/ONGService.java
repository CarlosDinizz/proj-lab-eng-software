package com.supets.community.ong.service;

import com.supets.community.ong.dto.OngDto;
import java.util.UUID;

public interface ONGService {
    UUID createOng(OngDto request);
    String getOng(Integer id);
}
