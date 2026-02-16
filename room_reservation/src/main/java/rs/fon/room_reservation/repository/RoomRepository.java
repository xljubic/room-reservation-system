/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */
package rs.fon.room_reservation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.fon.room_reservation.model.entity.Room;

/**
 *
 * @author Aleksandar
 */
public interface RoomRepository extends JpaRepository<Room, Long>{
    
}
