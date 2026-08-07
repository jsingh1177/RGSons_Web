package MJC.RGSons.repository;

import MJC.RGSons.model.MerchandiseItemMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MerchandiseItemMappingRepository extends JpaRepository<MerchandiseItemMapping, Integer> {

    List<MerchandiseItemMapping> findByNodeIdOrderByItemCodeAsc(Integer nodeId);

    Optional<MerchandiseItemMapping> findByRootIdAndItemCode(Integer rootId, String itemCode);

    long countByNodeId(Integer nodeId);

    boolean existsByNodeId(Integer nodeId);

    @Query("SELECT m.nodeId, COUNT(m) FROM MerchandiseItemMapping m GROUP BY m.nodeId")
    List<Object[]> countMappedItemsByNode();
}
