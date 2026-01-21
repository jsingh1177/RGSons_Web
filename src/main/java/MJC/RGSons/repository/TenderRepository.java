package MJC.RGSons.repository;

import MJC.RGSons.model.Tender;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TenderRepository extends JpaRepository<Tender, String> {
    @Query("SELECT t FROM Tender t WHERE t.active = true")
    List<Tender> findByActiveTrue();
}
