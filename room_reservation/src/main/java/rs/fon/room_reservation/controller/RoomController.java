/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import rs.fon.room_reservation.model.entity.Room;
import rs.fon.room_reservation.repository.RoomRepository;

/**
 *
 * @author Aleksandar
 */

@RestController
@RequestMapping("/api/rooms")
@Tag(name = "Rooms", description = "CRUD operacije nad salama")
public class RoomController {
        private final RoomRepository roomRepository;

    public RoomController(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    @Operation(summary = "Vrati sve sale")
    @GetMapping
    public List<Room> getAll() {
        return roomRepository.findAll();
    }

    @Operation(summary = "Vrati salu po ID-ju")
    @GetMapping("/{id}")
    public ResponseEntity<Room> getById(@PathVariable Long id) {
        return roomRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Kreiraj novu salu")
    @PostMapping
    public Room create(@RequestBody Room room) {
        room.setId(null);
        return roomRepository.save(room);
    }

    @Operation(summary = "Izmeni postojeću salu")
    @PutMapping("/{id}")
    public ResponseEntity<Room> update(
            @PathVariable Long id,
            @RequestBody Room updated
    ) {
        return roomRepository.findById(id)
                .map(existing -> {
                    existing.setCode(updated.getCode());
                    existing.setCapacity(updated.getCapacity());
                    existing.setBuilding(updated.getBuilding());
                    existing.setFloorLevel(updated.getFloorLevel());
                    existing.setRoomType(updated.getRoomType());
                    existing.setNumberOfComputers(updated.getNumberOfComputers());
                    return ResponseEntity.ok(roomRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Obriši salu")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!roomRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        roomRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
