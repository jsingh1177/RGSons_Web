package MJC.RGSons.repository;

import MJC.RGSons.model.StiHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StiHeadRepository extends JpaRepository<StiHead, Integer> {
    StiHead findByStiNumber(String stiNumber);

    @org.springframework.data.jpa.repository.Query(value = "SELECT MAX(CAST(sti_number AS BIGINT)) FROM sti_head WHERE sti_number NOT LIKE '%[^0-9]%'", nativeQuery = true)
    Long findMaxStiNumber();
}
