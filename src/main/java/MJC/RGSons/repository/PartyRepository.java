package MJC.RGSons.repository;

import MJC.RGSons.model.Party;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartyRepository extends JpaRepository<Party, Long> {
    Party findByCode(String code);
    List<Party> findByStatus(Boolean status);
    List<Party> findByType(String type);
}
