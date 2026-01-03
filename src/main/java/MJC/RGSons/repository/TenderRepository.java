package MJC.RGSons.repository;

import MJC.RGSons.model.Tender;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TenderRepository extends MongoRepository<Tender, String> {
    @Query("{ 'active' : true }")
    List<Tender> findByActiveTrue();
}
