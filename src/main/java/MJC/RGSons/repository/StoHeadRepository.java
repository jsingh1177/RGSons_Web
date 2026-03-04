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
    List<StoHead> findByStatus(String status);
    List<StoHead> findByToStoreAndReceivedStatusAndStatus(String toStore, String receivedStatus, String status);
    boolean existsByFromStoreOrToStore(String fromStore, String toStore);

    @Query(value = "SELECT * FROM STO_head WHERE to_store = :toStore AND received_status = :receivedStatus AND status = 'SUBMITTED' AND TRY_CAST(date AS DATE) <= TRY_CAST(:businessDate AS DATE)", nativeQuery = true)
    List<StoHead> findPendingStosByDate(@Param("toStore") String toStore, @Param("receivedStatus") String receivedStatus, @Param("businessDate") String businessDate);

    @Query(value = "SELECT MAX(CAST(sto_number AS BIGINT)) FROM STO_head WHERE ISNUMERIC(sto_number) = 1", nativeQuery = true)
    Long findMaxStoNumber();
}
