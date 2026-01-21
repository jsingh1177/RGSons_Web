package MJC.RGSons.service;

import MJC.RGSons.model.Sequence;
import MJC.RGSons.repository.SequenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SequenceGeneratorService {

    @Autowired
    private SequenceRepository sequenceRepository;

    @Transactional
    public synchronized String generateSequence(String seqName) {
        Sequence sequence = sequenceRepository.findById(seqName)
                .orElse(new Sequence(seqName, 9999));

        sequence.setSeq(sequence.getSeq() + 1);
        sequenceRepository.save(sequence);
        
        return String.valueOf(sequence.getSeq());
    }
}
