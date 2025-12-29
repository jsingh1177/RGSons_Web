package MJC.RGSons.repository;

import MJC.RGSons.model.PriceMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PriceMasterRepository extends JpaRepository<PriceMaster, Long> {
    List<PriceMaster> findByItemCode(String itemCode);
    Optional<PriceMaster> findByItemCodeAndSizeCode(String itemCode, String sizeCode);
}
