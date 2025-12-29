package MJC.RGSons.service;

import MJC.RGSons.model.Ledger;
import MJC.RGSons.repository.LedgerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LedgerService {

    @Autowired
    private LedgerRepository ledgerRepository;

    public List<Ledger> getAllLedgers() {
        return ledgerRepository.findAll();
    }

    public List<Ledger> getLedgersByScreen(String screen) {
        return ledgerRepository.findByScreen(screen);
    }
    
    public List<Ledger> getLedgersByType(String type) {
        return ledgerRepository.findByType(type);
    }

    public List<Ledger> getActiveLedgersByTypeAndScreen(String type, String screen) {
        return ledgerRepository.findByTypeAndScreenAndStatus(type, screen, 1);
    }
}
