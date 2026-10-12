package com.supets.community.shared.service;

import com.supets.community.shared.dto.LocalDto;
import com.supets.community.shared.model.Local;

public interface LocalService {

    public Local saveLocal(LocalDto request);
}
