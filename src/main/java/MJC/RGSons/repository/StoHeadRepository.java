package MJC.RGSons.repository;

import MJC.RGSons.model.StoHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoHeadRepository extends JpaRepository<StoHead, Integer> {
    List<StoHead> findByStoNumber(String stoNumber);
    List<StoHead> findByToStoreAndReceivedStatus(String toStore, String receivedStatus);

    @Query(value = "SELECT * FROM sto_head WHERE to_store = :toStore AND received_status = :receivedStatus AND CONVERT(date, date, 103) <= CONVERT(date, :businessDate, 103)", nativeQuery = true)
    List<StoHead> findPendingStosByDate(@Param("toStore") String toStore, @Param("receivedStatus") String receivedStatus, @Param("businessDate") String businessDate);

    @Query(value = "SELECT MAX(CAST(sto_number AS BIGINT)) FROM sto_head WHERE ISNUMERIC(sto_number) = 1", nativeQuery = true)
    Long findMaxStoNumber();
}
