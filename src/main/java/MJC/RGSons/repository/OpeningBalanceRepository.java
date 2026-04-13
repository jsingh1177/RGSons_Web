package MJC.RGSons.repository;

import MJC.RGSons.model.OpeningBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OpeningBalanceRepository extends JpaRepository<OpeningBalance, Integer> {
    Optional<OpeningBalance> findByStoreCodeAndItemCodeAndSizeCode(String storeCode, String itemCode, String sizeCode);
    List<OpeningBalance> findByStoreCodeAndItemCodeInAndSizeCodeIn(String storeCode, List<String> itemCodes, List<String> sizeCodes);
    List<OpeningBalance> findByStoreCodeInAndSizeCodeIn(List<String> storeCodes, List<String> sizeCodes);
}
