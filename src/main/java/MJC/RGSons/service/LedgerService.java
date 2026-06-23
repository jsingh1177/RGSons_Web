package MJC.RGSons.service;

import MJC.RGSons.model.Ledger;
import MJC.RGSons.model.LedMaster;
import MJC.RGSons.repository.LedMasterRepository;
import MJC.RGSons.repository.LedgerRepository;
import MJC.RGSons.repository.PurHeadRepository;
import MJC.RGSons.repository.PurLedgerRepository;
import MJC.RGSons.repository.TranHeadRepository;
import MJC.RGSons.repository.TranLedgerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    @Autowired
    private LedMasterRepository ledMasterRepository;

    public List<Ledger> getAllLedgers() {
        return withLedMasterNames(ledgerRepository.findAll());
    }

    public List<Ledger> getLedgersByScreen(String screen) {
        return withLedMasterNames(ledgerRepository.findByScreen(screen));
    }
    
    public List<Ledger> getLedgersByType(String type) {
        return withLedMasterNames(ledgerRepository.findByType(type));
    }

    public List<Ledger> getActiveLedgersByTypeAndScreen(String type, String screen) {
        return withLedMasterNames(ledgerRepository.findByTypeAndScreenAndStatus(type, screen, 1));
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
        existingLedger.setPerc(ledgerDetails.getPerc());

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

    private List<Ledger> withLedMasterNames(List<Ledger> ledgers) {
        if (ledgers == null || ledgers.isEmpty()) {
            return ledgers;
        }

        Map<String, String> ledMasterNames = ledMasterRepository.findAll().stream()
                .filter(lm -> lm != null && lm.getCode() != null)
                .collect(Collectors.toMap(
                        lm -> lm.getCode().trim(),
                        lm -> {
                            String name = lm.getName();
                            return name == null || name.trim().isEmpty() ? lm.getCode().trim() : name.trim();
                        },
                        (a, b) -> a
                ));

        return ledgers.stream()
                .map(ledger -> copyWithResolvedName(ledger, ledMasterNames))
                .collect(Collectors.toList());
    }

    private Ledger copyWithResolvedName(Ledger ledger, Map<String, String> ledMasterNames) {
        if (ledger == null) {
            return null;
        }

        Ledger copy = new Ledger();
        copy.setId(ledger.getId());
        copy.setCode(ledger.getCode());
        copy.setType(ledger.getType());
        copy.setScreen(ledger.getScreen());
        copy.setStatus(ledger.getStatus());
        copy.setPerc(ledger.getPerc());
        copy.setShortOrder(ledger.getShortOrder());

        String code = ledger.getCode() == null ? "" : ledger.getCode().trim();
        String resolvedName = code.isEmpty() ? null : ledMasterNames.get(code);
        copy.setName(
                resolvedName != null && !resolvedName.isBlank()
                        ? resolvedName
                        : ledger.getName()
        );

        return copy;
    }
}
