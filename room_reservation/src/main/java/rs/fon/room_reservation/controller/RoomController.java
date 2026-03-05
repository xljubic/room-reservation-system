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
import rs.fon.room_reservation.service.RoomService;


/**
 *
 * @author Aleksandar
 */
@RestController
@RequestMapping("/api/rooms")
@Tag(name = "Rooms", description = "CRUD operacije nad salama")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @Operation(summary = "Vrati sve sale")
    @GetMapping
    public List<Room> getAll() {
        return roomService.getAll();
    }

    @Operation(summary = "Vrati salu po ID-ju")
    @GetMapping("/{id}")
    public ResponseEntity<Room> getById(@PathVariable Long id) {
        return roomService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Kreiraj novu salu")
    @PostMapping
    public Room create(@RequestBody Room room) {
        return roomService.create(room);
    }

    @Operation(summary = "Izmeni postojeću salu")
    @PutMapping("/{id}")
    public ResponseEntity<Room> update(@PathVariable Long id, @RequestBody Room updated) {
        return roomService.update(id, updated)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Obriši salu")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        boolean deleted = roomService.delete(id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}
