package MJC.RGSons.repository;

import MJC.RGSons.model.StiHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface StiHeadRepository extends JpaRepository<StiHead, Integer> {
    StiHead findByStiNumber(String stiNumber);

    @Query(value = "SELECT MAX(CAST(sti_number AS BIGINT)) FROM sti_head WHERE sti_number NOT LIKE '%[^0-9]%'", nativeQuery = true)
    Long findMaxStiNumber();

    java.util.List<StiHead> findByToStoreAndDate(String toStore, String date);

    @Modifying
    @Transactional
    @Query(value = "UPDATE sti_head SET tran_date = TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM([date])), 7, 4), '-', SUBSTRING(LTRIM(RTRIM([date])), 4, 2), '-', SUBSTRING(LTRIM(RTRIM([date])), 1, 2))) WHERE sti_number = ?1", nativeQuery = true)
    int syncTranDateFromStiNumber(String stiNumber);
}
