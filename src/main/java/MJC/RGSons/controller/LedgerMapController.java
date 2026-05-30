package MJC.RGSons.controller;

import MJC.RGSons.model.LedgerMap;
import MJC.RGSons.service.LedgerMapService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ledger-map")
@CrossOrigin(origins = "*")
public class LedgerMapController {

    @Autowired
    private LedgerMapService ledgerMapService;

    @GetMapping
    public ResponseEntity<List<LedgerMap>> getAll() {
        return ResponseEntity.ok(ledgerMapService.getAll());
    }

    @PostMapping
    public ResponseEntity<LedgerMap> create(@RequestBody LedgerMap ledgerMap) {
        return ResponseEntity.ok(ledgerMapService.create(ledgerMap));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LedgerMap> update(@PathVariable Integer id, @RequestBody LedgerMap ledgerMap) {
        return ResponseEntity.ok(ledgerMapService.update(id, ledgerMap));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        ledgerMapService.delete(id);
        return ResponseEntity.ok().build();
    }
}

