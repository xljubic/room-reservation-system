/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */
package rs.fon.room_reservation.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rs.fon.room_reservation.model.entity.Reservation;
import rs.fon.room_reservation.model.enums.ReservationStatus;

/**
 *
 * @author Aleksandar
 */
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    // samo APPROVED u opsegu dana (00:00 - 23:59:59)

    List<Reservation> findByStatusAndStartDateTimeGreaterThanEqualAndStartDateTimeLessThan(
            ReservationStatus status,
            LocalDateTime from,
            LocalDateTime to
    );

    // overlap check za salu (da spreči preklapanje)
    @Query("""
            select r from Reservation r
            where r.room.id = :roomId
              and r.status = :status
              and r.startDateTime < :end
              and r.endDateTime > :start
            """)
    List<Reservation> findOverlaps(
            @Param("roomId") Long roomId,
            @Param("status") ReservationStatus status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("""
        select r from Reservation r
        where r.room.id = :roomId
          and r.status in :statuses
          and r.startDateTime < :end
          and r.endDateTime > :start
        """)
    List<Reservation> findOverlapsWithStatuses(
            @Param("roomId") Long roomId,
            @Param("statuses") List<ReservationStatus> statuses,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("""
    select r from Reservation r
    where r.status = :status
      and r.startDateTime < :to
      and r.endDateTime > :from
""")
    List<Reservation> findByStatusOverlappingRange(
            @Param("status") ReservationStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    List<Reservation> findByCreatedByIdOrderByStartDateTimeDesc(Long userId);

    List<Reservation> findByStatusOrderByCreatedAtAsc(ReservationStatus status);

    List<Reservation> findByGroupIdOrderByStartDateTimeAsc(String groupId);

    List<Reservation> findByStatusAndGroupIdIsNotNullOrderByCreatedAtAsc(ReservationStatus status);
}
