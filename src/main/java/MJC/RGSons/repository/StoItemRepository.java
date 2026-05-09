package MJC.RGSons.repository;

import MJC.RGSons.model.StoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface StoItemRepository extends JpaRepository<StoItem, Integer> {
    List<StoItem> findByStoNumber(String stoNumber);
    List<StoItem> findByStoNumberOrderByIdAsc(String stoNumber);
    List<StoItem> findByFromStoreAndStoDate(String fromStore, String stoDate);
    void deleteByStoNumber(String stoNumber);

    @Modifying
    @Transactional
    @Query(value = "UPDATE STO_Item SET tran_date = TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(sto_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(sto_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(sto_date)), 1, 2))) WHERE sto_number = ?1", nativeQuery = true)
    int syncTranDateFromStoNumber(String stoNumber);
}
