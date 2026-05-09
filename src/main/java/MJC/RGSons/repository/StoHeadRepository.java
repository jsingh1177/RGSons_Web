package MJC.RGSons.repository;

import MJC.RGSons.model.StoHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface StoHeadRepository extends JpaRepository<StoHead, Integer> {
    List<StoHead> findByStoNumber(String stoNumber);
    List<StoHead> findByStatus(String status);
    List<StoHead> findByStatusAndTallySync(String status, String tallySync);
    List<StoHead> findByToStoreAndReceivedStatusAndStatus(String toStore, String receivedStatus, String status);
    List<StoHead> findByFromStoreAndDate(String fromStore, String date);
    List<StoHead> findByFromStoreAndStatus(String fromStore, String status);
    boolean existsByFromStoreOrToStore(String fromStore, String toStore);

    @Query(value = "SELECT * FROM STO_head WHERE to_store = :toStore AND received_status = :receivedStatus AND status = 'SUBMITTED' AND COALESCE(TRY_CONVERT(date, date, 105), TRY_CONVERT(date, date, 23), TRY_CONVERT(date, date, 103), TRY_CAST(date AS DATE)) <= COALESCE(TRY_CONVERT(date, :businessDate, 105), TRY_CONVERT(date, :businessDate, 23), TRY_CONVERT(date, :businessDate, 103), TRY_CAST(:businessDate AS DATE))", nativeQuery = true)
    List<StoHead> findPendingStosByDate(@Param("toStore") String toStore, @Param("receivedStatus") String receivedStatus, @Param("businessDate") String businessDate);

    @Query(value = "SELECT MAX(CAST(sto_number AS BIGINT)) FROM STO_head WHERE ISNUMERIC(sto_number) = 1", nativeQuery = true)
    Long findMaxStoNumber();

    @Modifying
    @Transactional
    @Query(value = "UPDATE STO_head SET tran_date = TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM([date])), 7, 4), '-', SUBSTRING(LTRIM(RTRIM([date])), 4, 2), '-', SUBSTRING(LTRIM(RTRIM([date])), 1, 2))) WHERE sto_number = ?1", nativeQuery = true)
    int syncTranDateFromStoNumber(String stoNumber);
}
