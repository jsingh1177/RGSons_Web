package MJC.RGSons.service;

import MJC.RGSons.model.Sequence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class SequenceGeneratorService {

    @Autowired
    private MongoOperations mongoOperations;

    public String generateSequence(String seqName) {
        // Initialize sequence if it doesn't exist, starting at 9999 so first one is 10000
        // We use Upsert to create if not exists
        
        // Check if sequence exists first to set initial value correctly if missing
        Query query = new Query(Criteria.where("_id").is(seqName));
        if (!mongoOperations.exists(query, Sequence.class)) {
            Sequence seq = new Sequence();
            seq.setId(seqName);
            seq.setSeq(9999); // Start before 10000
            mongoOperations.save(seq);
        }

        Update update = new Update().inc("seq", 1);
        FindAndModifyOptions options = new FindAndModifyOptions().returnNew(true).upsert(true);

        Sequence counter = mongoOperations.findAndModify(query,
                update, options, Sequence.class);

        return String.valueOf(!Objects.isNull(counter) ? counter.getSeq() : 10000);
    }
}
