/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.service.impl;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import rs.fon.room_reservation.model.entity.Room;
import rs.fon.room_reservation.repository.RoomRepository;
import rs.fon.room_reservation.service.RoomService;

/**
 *
 * @author Aleksandar
 */
@Service
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;

    public RoomServiceImpl(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    @Override
    public List<Room> getAll() {
        return roomRepository.findAll();
    }

    @Override
    public Optional<Room> getById(Long id) {
        return roomRepository.findById(id);
    }

    @Override
    public Room create(Room room) {
        if (room == null) {
            throw new IllegalArgumentException("Room is required.");
        }
        room.setId(null);
        return roomRepository.save(room);
    }

    @Override
    public Optional<Room> update(Long id, Room updated) {
        if (updated == null) {
            throw new IllegalArgumentException("Updated room is required.");
        }

        return roomRepository.findById(id).map(existing -> {
            existing.setCode(updated.getCode());
            existing.setCapacity(updated.getCapacity());
            existing.setBuilding(updated.getBuilding());
            existing.setFloorLevel(updated.getFloorLevel());
            existing.setRoomType(updated.getRoomType());
            existing.setNumberOfComputers(updated.getNumberOfComputers());
            return roomRepository.save(existing);
        });
    }

    @Override
    public boolean delete(Long id) {
        if (!roomRepository.existsById(id)) {
            return false;
        }
        roomRepository.deleteById(id);
        return true;
    }
}
