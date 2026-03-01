package MJC.RGSons.service;

import MJC.RGSons.model.Ledger;
import MJC.RGSons.repository.LedgerRepository;
import MJC.RGSons.repository.PurHeadRepository;
import MJC.RGSons.repository.PurLedgerRepository;
import MJC.RGSons.repository.TranHeadRepository;
import MJC.RGSons.repository.TranLedgerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LedgerService {

    @Autowired
    private LedgerRepository ledgerRepository;

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    private TranLedgerRepository tranLedgerRepository;

    @Autowired
    private PurLedgerRepository purLedgerRepository;

    @Autowired
    private TranHeadRepository tranHeadRepository;

    @Autowired
    private PurHeadRepository purHeadRepository;

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

    public List<String> getDistinctTypes() {
        return ledgerRepository.findDistinctTypes();
    }

    public List<String> getDistinctScreens() {
        return ledgerRepository.findDistinctScreens();
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
        
        String ledgerCode = ledger.getCode();
        
        // Check if used in TranLedgers, PurLedgers, TranHead, PurHead
        boolean isUsed = false;
        
        if (tranLedgerRepository.existsByLedgerCode(ledgerCode)) {
            isUsed = true;
        } else if (purLedgerRepository.existsByLedgerCode(ledgerCode)) {
            isUsed = true;
        } else if (tranHeadRepository.existsByPartyCode(ledgerCode)) {
            isUsed = true;
        } else if (purHeadRepository.existsByPartyCode(ledgerCode)) {
            isUsed = true;
        } else if (purHeadRepository.existsByPurLed(ledgerCode)) {
            isUsed = true;
        }
        
        if (isUsed) {
            // Mark as inactive (soft delete)
            ledger.setStatus(0);
            ledgerRepository.save(ledger);
        } else {
            // Hard delete
            try {
                ledgerRepository.deleteById(id);
            } catch (Exception e) {
                // Fallback to soft delete
                ledger.setStatus(0);
                ledgerRepository.save(ledger);
            }
        }
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
