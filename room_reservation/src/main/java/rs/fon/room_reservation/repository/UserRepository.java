/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */
package rs.fon.room_reservation.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import rs.fon.room_reservation.model.entity.User;

/**
 *
 * @author Aleksandar
 */
public interface UserRepository extends JpaRepository<User, Long>{
    Optional<User> findByEmail(String email);
}
