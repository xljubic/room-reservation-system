/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.service.impl;

import java.util.NoSuchElementException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import rs.fon.room_reservation.dto.ChangePasswordRequest;
import rs.fon.room_reservation.dto.LoginRequest;
import rs.fon.room_reservation.dto.LoginResponse;
import rs.fon.room_reservation.repository.UserRepository;
import rs.fon.room_reservation.service.AuthService;

/**
 *
 * @author Aleksandar
 */
@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public LoginResponse login(LoginRequest req) {
        if (req == null || req.getEmail() == null || req.getPassword() == null) {
            throw new IllegalArgumentException("Email i password su obavezni.");
        }

        var userOpt = userRepository.findByEmail(req.getEmail().trim());
        if (userOpt.isEmpty()) {
            throw new SecurityException("Pogrešan email ili šifra.");
        }

        var user = userOpt.get();
        if (user.getPasswordHash() == null || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new SecurityException("Pogrešan email ili šifra.");
        }

        var resp = new LoginResponse();
        resp.setId(user.getId());
        resp.setEmail(user.getEmail());
        resp.setRole(user.getRole().name());
        resp.setFirstName(user.getFirstName());
        resp.setLastName(user.getLastName());
        return resp;
    }

    @Override
    public String changePassword(ChangePasswordRequest req) {
        if (req == null || req.getUserId() == null) {
            throw new IllegalArgumentException("Nedostaje userId.");
        }
        if (req.getOldPassword() == null || req.getOldPassword().isBlank()) {
            throw new IllegalArgumentException("Unesi staru šifru.");
        }
        if (req.getNewPassword() == null || req.getNewPassword().isBlank()) {
            throw new IllegalArgumentException("Unesi novu šifru.");
        }
        if (req.getNewPassword().length() < 4) {
            throw new IllegalArgumentException("Nova šifra je prekratka.");
        }

        var opt = userRepository.findById(req.getUserId());
        if (opt.isEmpty()) {
            throw new NoSuchElementException("Korisnik nije pronađen.");
        }

        var user = opt.get();
        var currentHash = user.getPasswordHash();
        if (currentHash == null || currentHash.isBlank()) {
            throw new IllegalArgumentException("Korisnik nema podešenu šifru.");
        }
        if (!passwordEncoder.matches(req.getOldPassword(), currentHash)) {
            throw new IllegalArgumentException("Stara šifra nije tačna.");
        }

        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);

        return "Šifra je uspešno promenjena.";
    }
}
