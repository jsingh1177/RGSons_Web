package MJC.RGSons.repository;

import MJC.RGSons.model.TenderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TenderTypeRepository extends JpaRepository<TenderType, Long> {
    Optional<TenderType> findByTenderCode(String tenderCode);
    List<TenderType> findByStatus(Boolean status);
}
