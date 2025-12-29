package MJC.RGSons.service;

import MJC.RGSons.model.Tender;
import MJC.RGSons.repository.TenderRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TenderService {

    @Autowired
    private TenderRepository tenderRepository;

    public List<Tender> getActiveTenders() {
        return tenderRepository.findByActiveTrue();
    }

    @PostConstruct
    public void initTenders() {
        if (tenderRepository.count() == 0) {
            tenderRepository.save(new Tender("Cash", "CASH", true));
            tenderRepository.save(new Tender("Card", "CARD", true));
            tenderRepository.save(new Tender("UPI", "UPI", true));
        }
    }
}
