/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import rs.fon.room_reservation.repository.UserRepository;

/**
 *
 * @author Aleksandar
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public static class LoginRequest {

        public String email;
        public String password;
    }

    public static class LoginResponse {

        public Long id;
        public String email;
        public String role;
        public String firstName;
        public String lastName;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (req == null || req.email == null || req.password == null) {
            return ResponseEntity.badRequest().body("Email i password su obavezni.");
        }

        var userOpt = userRepository.findByEmail(req.email.trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Pogrešan email ili šifra.");
        }

        var user = userOpt.get();
        if (user.getPasswordHash() == null || !encoder.matches(req.password, user.getPasswordHash())) {
            return ResponseEntity.status(401).body("Pogrešan email ili šifra.");
        }

        var resp = new LoginResponse();
        resp.id = user.getId();
        resp.email = user.getEmail();
        resp.role = user.getRole().name();
        resp.firstName = user.getFirstName();
        resp.lastName = user.getLastName();

        return ResponseEntity.ok(resp);
    }
//ovo je bilo pomocno moze da se obrise
    @PostMapping("/debug/set-password")
    public String setPassword(@RequestParam String email, @RequestParam String password) {
        var uOpt = userRepository.findByEmail(email);
        if (uOpt.isEmpty()) {
            return "NO USER";
        }
        var u = uOpt.get();
        u.setPasswordHash(encoder.encode(password));
        userRepository.save(u);
        return "OK";
    }
}
