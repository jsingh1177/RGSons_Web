package MJC.RGSons.service;

import MJC.RGSons.model.LedgerMap;
import MJC.RGSons.repository.LedgerMapRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LedgerMapService {

    @Autowired
    private LedgerMapRepository ledgerMapRepository;

    public List<LedgerMap> getAll() {
        return ledgerMapRepository.findAll();
    }

    public LedgerMap create(LedgerMap ledgerMap) {
        ledgerMap.setId(null);
        if (ledgerMap.getStatus() == null) {
            ledgerMap.setStatus(1);
        }
        return ledgerMapRepository.save(ledgerMap);
    }

    public LedgerMap update(Integer id, LedgerMap ledgerMapDetails) {
        LedgerMap existing = ledgerMapRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ledger map not found with id: " + id));

        existing.setLedgerCode(ledgerMapDetails.getLedgerCode());
        existing.setScreen(ledgerMapDetails.getScreen());
        existing.setType(ledgerMapDetails.getType());
        existing.setStatus(ledgerMapDetails.getStatus());
        existing.setPerc(ledgerMapDetails.getPerc());

        return ledgerMapRepository.save(existing);
    }

    public void delete(Integer id) {
        ledgerMapRepository.deleteById(id);
    }
}
