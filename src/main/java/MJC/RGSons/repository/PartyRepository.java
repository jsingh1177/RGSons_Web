package MJC.RGSons.repository;

import MJC.RGSons.model.Party;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartyRepository extends MongoRepository<Party, String> {
    Party findByCode(String code);
    List<Party> findByStatus(Boolean status);
    List<Party> findByType(String type);
    
    boolean existsByNameIgnoreCase(String name);
}
