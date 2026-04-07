package MJC.RGSons.repository;

import MJC.RGSons.model.StiItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface StiItemRepository extends JpaRepository<StiItem, Integer> {
    List<StiItem> findByStiNumber(String stiNumber);
    List<StiItem> findByToStoreAndStiDate(String toStore, String stiDate);

    @Modifying
    @Transactional
    @Query(value = "UPDATE sti_item SET tran_date = TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(sti_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(sti_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(sti_date)), 1, 2))) WHERE sti_number = ?1", nativeQuery = true)
    int syncTranDateFromStiNumber(String stiNumber);
}
