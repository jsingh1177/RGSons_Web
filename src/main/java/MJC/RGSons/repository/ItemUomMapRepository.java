package MJC.RGSons.repository;

import MJC.RGSons.model.ItemUomMap;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemUomMapRepository extends JpaRepository<ItemUomMap, Integer> {
    List<ItemUomMap> findByItemCodeOrderByIdAsc(String itemCode);
    List<ItemUomMap> findByItemCodeAndSizeCodeOrderByIdAsc(String itemCode, String sizeCode);
}

