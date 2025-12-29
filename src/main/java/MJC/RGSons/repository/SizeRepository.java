package MJC.RGSons.repository;

import MJC.RGSons.model.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SizeRepository extends JpaRepository<Size, Long> {
    
    Optional<Size> findByCode(String code);
    
    Optional<Size> findByName(String name);
    
    Optional<Size> findByNameIgnoreCase(String name);
    
    List<Size> findByStatus(Boolean status);
    
    List<Size> findByStatusOrderByNameAsc(Boolean status);
    
    boolean existsByCode(String code);
    
    List<Size> findByNameContainingIgnoreCase(String name);
    
    long countByStatus(Boolean status);
    
    List<Size> findByCreatedAtAfter(LocalDateTime date);
    
    @Query("SELECT s FROM Size s WHERE " +
           "(:name IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
           "(:status IS NULL OR s.status = :status)")
    List<Size> findByNameAndStatus(@Param("name") String name, @Param("status") Boolean status);
}