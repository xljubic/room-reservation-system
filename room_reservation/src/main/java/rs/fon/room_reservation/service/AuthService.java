/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */
package rs.fon.room_reservation.service;

import rs.fon.room_reservation.dto.ChangePasswordRequest;
import rs.fon.room_reservation.dto.LoginRequest;
import rs.fon.room_reservation.dto.LoginResponse;

/**
 *
 * @author Aleksandar
 */
public interface AuthService {

    LoginResponse login(LoginRequest req);

    /**
     * Changes password for given userId.
     *
     * @return success message
     */
    String changePassword(ChangePasswordRequest req);
}
