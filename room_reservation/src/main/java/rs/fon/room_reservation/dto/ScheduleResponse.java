/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.dto;

import java.util.List;
import rs.fon.room_reservation.model.entity.Reservation;
import rs.fon.room_reservation.model.entity.Room;

/**
 *
 * @author Aleksandar
 */
public class ScheduleResponse {

    private String date;          // YYYY-MM-DD
    private String dayStart;      // "08:00"
    private String dayEnd;        // "20:00"
    private int slotMinutes;      // 30

    private List<Room> rooms;
    private List<Reservation> approvedReservations;

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getDayStart() {
        return dayStart;
    }

    public void setDayStart(String dayStart) {
        this.dayStart = dayStart;
    }

    public String getDayEnd() {
        return dayEnd;
    }

    public void setDayEnd(String dayEnd) {
        this.dayEnd = dayEnd;
    }

    public int getSlotMinutes() {
        return slotMinutes;
    }

    public void setSlotMinutes(int slotMinutes) {
        this.slotMinutes = slotMinutes;
    }

    public List<Room> getRooms() {
        return rooms;
    }

    public void setRooms(List<Room> rooms) {
        this.rooms = rooms;
    }

    public List<Reservation> getApprovedReservations() {
        return approvedReservations;
    }

    public void setApprovedReservations(List<Reservation> approvedReservations) {
        this.approvedReservations = approvedReservations;
    }
}
