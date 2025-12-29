package MJC.RGSons.repository;

import MJC.RGSons.model.Quality;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface QualityRepository extends JpaRepository<Quality, Long> {
    
    Optional<Quality> findByQualityCode(String qualityCode);
    
    List<Quality> findByStatus(Boolean status);
    
    boolean existsByQualityCode(String qualityCode);
    
    List<Quality> findByQualityNameContainingIgnoreCase(String qualityName);
    
    long countByStatus(Boolean status);
    
    List<Quality> findByCreatedAtAfter(LocalDateTime date);
    
    @Query("SELECT q FROM Quality q WHERE " +
           "(:name IS NULL OR LOWER(q.qualityName) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
           "(:status IS NULL OR q.status = :status)")
    List<Quality> findByNameAndStatus(@Param("name") String name, @Param("status") Boolean status);
}
