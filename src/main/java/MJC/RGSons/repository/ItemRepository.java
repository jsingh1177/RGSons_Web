package MJC.RGSons.repository;

import MJC.RGSons.model.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {
    Optional<Item> findByItemCode(String itemCode);
    Optional<Item> findByItemName(String itemName);
    boolean existsByItemCode(String itemCode);
    boolean existsByItemNameIgnoreCase(String itemName);
    Optional<Item> findByItemNameIgnoreCase(String itemName);
    List<Item> findByStatus(Boolean status);
    @Query("SELECT i FROM Item i WHERE LOWER(i.itemName) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Item> findByItemNameContainingIgnoreCase(@Param("name") String name);

    @Query("SELECT i FROM Item i WHERE LOWER(i.itemName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(i.itemCode) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Item> searchByCodeOrName(@Param("query") String query);

    @Query(value = "SELECT NEXT VALUE FOR dbo.Master_SEQ", nativeQuery = true)
    Long getNextSequenceValue();
}
