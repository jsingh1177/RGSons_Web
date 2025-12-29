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
}
