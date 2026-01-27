package MJC.RGSons.repository;

import MJC.RGSons.model.Sequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SequenceRepository extends JpaRepository<Sequence, Integer> {
    Optional<Sequence> findBySequenceName(String sequenceName);
}
