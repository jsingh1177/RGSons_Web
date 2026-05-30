package MJC.RGSons.repository;

import MJC.RGSons.model.Uom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UomRepository extends JpaRepository<Uom, Integer> {

    Optional<Uom> findByCode(String code);

    Optional<Uom> findByNameIgnoreCase(String name);

    boolean existsByCode(String code);

    boolean existsByNameIgnoreCase(String name);

    List<Uom> findByStatus(Boolean status);

    List<Uom> findByStatusOrderByNameAsc(Boolean status);

    List<Uom> findByNameContainingIgnoreCase(String name);

    long countByStatus(Boolean status);

    List<Uom> findByCreatedAtAfter(LocalDateTime date);
}

