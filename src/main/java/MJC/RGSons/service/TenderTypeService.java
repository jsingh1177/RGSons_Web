package MJC.RGSons.service;

import MJC.RGSons.model.TenderType;
import MJC.RGSons.repository.TenderTypeRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class TenderTypeService {

    @Autowired
    private TenderTypeRepository tenderTypeRepository;

    @PostConstruct
    public void init() {
        if (tenderTypeRepository.count() == 0) {
            tenderTypeRepository.save(new TenderType("CASH", "Cash", true));
            tenderTypeRepository.save(new TenderType("CARD", "Card", true));
            tenderTypeRepository.save(new TenderType("UPI", "UPI", true));
        }
    }

    public List<TenderType> getAllTenderTypes() {
        return tenderTypeRepository.findAll();
    }

    public List<TenderType> getActiveTenderTypes() {
        return tenderTypeRepository.findByStatus(true);
    }
}
