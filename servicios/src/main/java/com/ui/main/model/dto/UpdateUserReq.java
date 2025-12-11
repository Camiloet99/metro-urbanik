package com.ui.main.model.dto;

import lombok.Data;

@Data
public class UpdateUserReq {
    private String name;
    private String phone;      // celular sin +57, como en el form
    private Integer avatarId;

    private String genero;
    private String municipio;
    private String barrio;
    private String enfoque;
}