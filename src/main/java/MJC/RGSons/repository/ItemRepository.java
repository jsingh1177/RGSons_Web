package MJC.RGSons.repository;

import MJC.RGSons.model.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRepository extends JpaRepository<Item, Integer> {
    Optional<Item> findByItemCode(String itemCode);
    Optional<Item> findByItemName(String itemName);
    boolean existsByItemCode(String itemCode);
    boolean existsByItemNameIgnoreCase(String itemName);
    Optional<Item> findByItemNameIgnoreCase(String itemName);
    List<Item> findByStatus(Boolean status);
    
    // Standard JpaRepository method
    List<Item> findByItemNameContainingIgnoreCase(String name);

    @Query("SELECT i FROM Item i WHERE LOWER(i.itemName) LIKE LOWER(CONCAT('%', ?1, '%')) OR LOWER(i.itemCode) LIKE LOWER(CONCAT('%', ?1, '%'))")
    List<Item> searchByCodeOrName(String query);

    @Query("SELECT i FROM Item i WHERE LOWER(i.itemName) LIKE LOWER(CONCAT('%', ?1, '%')) OR LOWER(i.itemCode) LIKE LOWER(CONCAT('%', ?1, '%'))")
    org.springframework.data.domain.Page<Item> searchByCodeOrName(String query, org.springframework.data.domain.Pageable pageable);

    boolean existsByBrandCode(String brandCode);
    boolean existsByCategoryCode(String categoryCode);
}
