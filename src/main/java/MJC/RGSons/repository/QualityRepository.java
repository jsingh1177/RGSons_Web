package MJC.RGSons.repository;

import MJC.RGSons.model.Quality;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface QualityRepository extends MongoRepository<Quality, String> {
    
    Optional<Quality> findByQualityCode(String qualityCode);
    
    List<Quality> findByStatus(Boolean status);
    
    boolean existsByQualityCode(String qualityCode);
    
    List<Quality> findByQualityNameContainingIgnoreCase(String qualityName);
    
    long countByStatus(Boolean status);
    
    List<Quality> findByCreatedAtAfter(LocalDateTime date);
    
    List<Quality> findByQualityNameContainingIgnoreCaseAndStatus(String name, Boolean status);
}
