package com.ui.main.model.dto;

import lombok.Data;

import java.util.List;

@Data
public class TestSubmitReq {
    private String kind;              // "test-inicial" | "test-salida"
    private List<Object> answers;     // para el inicial: [q1, q2, q3, q4, q5]
    private String submittedAt;       // opcional, por si quieres loguear
}