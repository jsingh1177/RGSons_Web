package MJC.RGSons.controller;

import MJC.RGSons.dto.DSRSaveRequest;
import MJC.RGSons.model.DSR;
import MJC.RGSons.model.DSRHead;
import MJC.RGSons.repository.DSRRepository;
import MJC.RGSons.service.DSRService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dsr")
@CrossOrigin(origins = "*")
public class DSRController {

    @Autowired
    private DSRRepository dsrRepository;

    @Autowired
    private MJC.RGSons.repository.DSRHeadRepository dsrHeadRepository;

    @Autowired
    private DSRService dsrService;

    @GetMapping("/by-store-date")
    public ResponseEntity<List<DSR>> getDsrByStoreAndDate(
            @RequestParam String store,
            @RequestParam String date) {
        List<DSR> dsrs = dsrRepository.findByStoreAndBusinessDate(store, date);
        return ResponseEntity.ok(dsrs);
    }

    @GetMapping("/head")
    public ResponseEntity<DSRHead> getDsrHead(
            @RequestParam String storeCode,
            @RequestParam String dsrDate) {
        return dsrHeadRepository.findByStoreCodeAndDsrDate(storeCode, dsrDate)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status")
    public ResponseEntity<String> getDsrStatus(
            @RequestParam String store,
            @RequestParam String date) {
        String status = dsrService.getDSRStatus(store, date);
        return ResponseEntity.ok(status);
    }

    @PostMapping("/save")
    public ResponseEntity<String> saveDSR(@RequestBody DSRSaveRequest request) {
        try {
            dsrService.saveDSR(request);
            return ResponseEntity.ok("DSR saved successfully");
        } catch (Exception e) {
            e.printStackTrace(); // Log the full stack trace
            return ResponseEntity.badRequest().body("Error saving DSR: " + e.getMessage());
        }
    }
}

