package MJC.RGSons.controller;

import MJC.RGSons.dto.DSRSaveRequest;
import MJC.RGSons.model.DSR;
import MJC.RGSons.model.DSRHead;
import MJC.RGSons.repository.DSRRepository;
import MJC.RGSons.service.DSRService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
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

    @PostMapping("/refresh")
    public ResponseEntity<String> refreshDSR(
            @RequestParam String store, 
            @RequestParam String date, 
            @RequestParam String user) {
        try {
            dsrService.populateDSR(store, date, user);
            return ResponseEntity.ok("DSR refreshed successfully");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error refreshing DSR: " + e.getMessage());
        }
    }

    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> exportDsr(
            @RequestParam String store,
            @RequestParam String date) {
        try {
            ByteArrayInputStream in = dsrService.exportDSRToExcel(store, date);

            HttpHeaders headers = new HttpHeaders();
            String filename = "DSR_" + store + "_" + date + ".xlsx";
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename);

            return ResponseEntity.ok()
                    .headers(headers)
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new InputStreamResource(in));
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
