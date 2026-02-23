package MJC.RGSons.controller;

import MJC.RGSons.model.Ledger;
import MJC.RGSons.service.LedgerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ledgers")
@CrossOrigin(origins = "*")
public class LedgerController {

    @Autowired
    private LedgerService ledgerService;

    @GetMapping
    public ResponseEntity<List<Ledger>> getAllLedgers() {
        return ResponseEntity.ok(ledgerService.getAllLedgers());
    }

    @GetMapping("/types")
    public ResponseEntity<List<String>> getLedgerTypes() {
        return ResponseEntity.ok(ledgerService.getDistinctTypes());
    }

    @GetMapping("/screens")
    public ResponseEntity<List<String>> getLedgerScreens() {
        return ResponseEntity.ok(ledgerService.getDistinctScreens());
    }

    @GetMapping("/screen/{screen}")
    public ResponseEntity<List<Ledger>> getLedgersByScreen(@PathVariable String screen) {
        return ResponseEntity.ok(ledgerService.getLedgersByScreen(screen));
    }
    
    @GetMapping("/type/{type}")
    public ResponseEntity<List<Ledger>> getLedgersByType(@PathVariable String type) {
        return ResponseEntity.ok(ledgerService.getLedgersByType(type));
    }

    @GetMapping("/filter")
    public ResponseEntity<List<Ledger>> getLedgersByFilter(
            @RequestParam String type,
            @RequestParam String screen) {
        return ResponseEntity.ok(ledgerService.getActiveLedgersByTypeAndScreen(type, screen));
    }

    @PostMapping
    public ResponseEntity<Ledger> createLedger(@RequestBody Ledger ledger) {
        return ResponseEntity.ok(ledgerService.createLedger(ledger));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Ledger> updateLedger(@PathVariable Integer id, @RequestBody Ledger ledger) {
        return ResponseEntity.ok(ledgerService.updateLedger(id, ledger));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLedger(@PathVariable Integer id) {
        ledgerService.deleteLedger(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/order")
    public ResponseEntity<java.util.Map<String, Object>> updateLedgerOrder(@RequestBody List<Integer> ledgerIds) {
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        try {
            ledgerService.updateLedgerOrder(ledgerIds);
            response.put("success", true);
            response.put("message", "Ledger order updated successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error updating ledger order: " + e.getMessage());
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
