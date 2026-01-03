package MJC.RGSons.repository;

import MJC.RGSons.model.Item;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRepository extends MongoRepository<Item, String> {
    Optional<Item> findByItemCode(String itemCode);
    Optional<Item> findByItemName(String itemName);
    boolean existsByItemCode(String itemCode);
    boolean existsByItemNameIgnoreCase(String itemName);
    Optional<Item> findByItemNameIgnoreCase(String itemName);
    List<Item> findByStatus(Boolean status);
    
    // Standard MongoRepository method, no @Query needed
    List<Item> findByItemNameContainingIgnoreCase(String name);

    @Query("{ '$or': [ { 'itemName': { $regex: ?0, $options: 'i' } }, { 'itemCode': { $regex: ?0, $options: 'i' } } ] }")
    List<Item> searchByCodeOrName(String query);
}
