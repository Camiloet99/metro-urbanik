package com.ui.main.services;

import com.ui.main.model.dto.UpdateUserReq;
import com.ui.main.repository.UserRepository;
import com.ui.main.repository.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository users;

    public Mono<UserEntity> getByEmail(String email) {
        return users.findByEmailIgnoreCase(email)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND)));
    }

    public Mono<UserEntity> patchUser(String email, UpdateUserReq req) {
        return getByEmail(email).flatMap(u -> {
            if (req.getName() != null) {
                u.setName(req.getName());
            }

            if (req.getPhone() != null) {
                String raw = req.getPhone().trim();
                String normalized = raw.startsWith("+") ? raw : "+57" + raw;
                u.setCelular(normalized);
            }

            if (req.getAvatarId() != null) {
                u.setAvatarId(req.getAvatarId());
            }

            if (req.getGenero() != null) {
                u.setGenero(req.getGenero());
            }

            if (req.getMunicipio() != null) {
                u.setCiudadResidencia(req.getMunicipio());
            }

            if (req.getBarrio() != null) {
                u.setSubregion(req.getBarrio());
            }

            if (req.getEnfoque() != null) {
                u.setEnfoqueDiferencial(req.getEnfoque());
            }

            return users.save(u);
        });
    }
}