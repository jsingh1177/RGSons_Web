package MJC.RGSons.repository;

import MJC.RGSons.model.DSRHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DSRHeadRepository extends JpaRepository<DSRHead, String> {
    Optional<DSRHead> findByStoreCodeAndDsrDate(String storeCode, String dsrDate);
}
