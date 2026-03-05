/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */
package rs.fon.room_reservation.service;

import java.util.List;
import java.util.Optional;
import rs.fon.room_reservation.model.entity.Room;

/**
 *
 * @author Aleksandar
 */
public interface RoomService {

    List<Room> getAll();

    Optional<Room> getById(Long id);

    Room create(Room room);

    Optional<Room> update(Long id, Room updated);

    boolean delete(Long id);
}
