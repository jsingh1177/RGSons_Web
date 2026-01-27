package MJC.RGSons.repository;

import MJC.RGSons.model.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SizeRepository extends JpaRepository<Size, Integer> {
    
    Optional<Size> findByCode(String code);
    
    Optional<Size> findByName(String name);
    
    Optional<Size> findByNameIgnoreCase(String name);
    
    boolean existsByNameIgnoreCase(String name);
    
    List<Size> findByStatus(Boolean status);
    
    List<Size> findByStatusOrderByNameAsc(Boolean status);
    
    boolean existsByCode(String code);
    
    List<Size> findByNameContainingIgnoreCase(String name);
    
    long countByStatus(Boolean status);
    
    List<Size> findByCreatedAtAfter(LocalDateTime date);
    
    List<Size> findByNameContainingIgnoreCaseAndStatus(String name, Boolean status);
}