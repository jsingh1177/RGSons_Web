package MJC.RGSons.service;

import MJC.RGSons.model.Sequence;
import MJC.RGSons.repository.SequenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;

@Service
public class SequenceGeneratorService {

    @Autowired
    private SequenceRepository sequenceRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public synchronized String generateSequence(String seqName) {
        // Use native SQL Sequence for Master_SEQ
        if ("Master_SEQ".equalsIgnoreCase(seqName)) {
            Query query = entityManager.createNativeQuery("SELECT NEXT VALUE FOR dbo.Master_SEQ");
            Object result = query.getSingleResult();
            return String.valueOf(result);
        }

        // Fallback to table-based sequence for others
        Sequence sequence = sequenceRepository.findBySequenceName(seqName)
                .orElse(new Sequence(seqName, 9999));

        sequence.setSeq(sequence.getSeq() + 1);
        sequenceRepository.save(sequence);
        
        return String.valueOf(sequence.getSeq());
    }
}
