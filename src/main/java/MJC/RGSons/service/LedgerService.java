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

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;

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

    public Ledger createLedger(Ledger ledger) {
        // Generate Code from Sequence
        ledger.setCode(sequenceGeneratorService.generateSequence("Master_SEQ"));

        if (ledgerRepository.existsByNameIgnoreCase(ledger.getName())) {
            throw new RuntimeException("Ledger name already exists.");
        }
        if (ledger.getStatus() == null) {
            ledger.setStatus(1);
        }
        return ledgerRepository.save(ledger);
    }

    public Ledger updateLedger(Integer id, Ledger ledgerDetails) {
        Ledger existingLedger = ledgerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ledger not found with id: " + id));

        // Code is non-editable, so we don't update it.
        
        // Check for name uniqueness excluding the current ledger
        if (!existingLedger.getName().equalsIgnoreCase(ledgerDetails.getName()) && 
            ledgerRepository.existsByNameIgnoreCase(ledgerDetails.getName())) {
            throw new RuntimeException("Ledger name already exists.");
        }

        // existingLedger.setCode(ledgerDetails.getCode()); // Code is immutable
        existingLedger.setName(ledgerDetails.getName());
        existingLedger.setType(ledgerDetails.getType());
        existingLedger.setScreen(ledgerDetails.getScreen());
        existingLedger.setStatus(ledgerDetails.getStatus());

        return ledgerRepository.save(existingLedger);
    }

    public void deleteLedger(Integer id) {
        Ledger ledger = ledgerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ledger not found with id: " + id));
        ledger.setStatus(0);
        ledgerRepository.save(ledger);
    }

    public void updateLedgerOrder(List<Integer> ledgerIds) {
        for (int i = 0; i < ledgerIds.size(); i++) {
            Integer id = ledgerIds.get(i);
            java.util.Optional<Ledger> optionalLedger = ledgerRepository.findById(id);
            if (optionalLedger.isPresent()) {
                Ledger ledger = optionalLedger.get();
                ledger.setShortOrder(i + 1); // 1-based index
                ledgerRepository.save(ledger);
            }
        }
    }
}
